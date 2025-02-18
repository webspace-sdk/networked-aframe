/* global AFRAME, NAF, THREE, performance, CustomEvent */
const flexbuffers = require('flatbuffers/js/flexbuffers')
const { Reference } = require('flatbuffers/js/flexbuffers/reference')
const { ByteBuffer } = require('flatbuffers/js/byte-buffer')
const { Builder } = require('flatbuffers/js/builder')
const { Long } = require('flatbuffers/js/long')
const { fromByteWidth } = require('flatbuffers/js/flexbuffers/bit-width-util')
const { refCp, refGetNumeric, refGetInt, refGetToObject, refAdvanceToIndexGet } = require('../FlexBufferUtils')
const deepEqual = require('../DeepEquals')
const DEG2RAD = THREE.MathUtils.DEG2RAD
const OBJECT3D_COMPONENTS = ['position', 'rotation', 'scale']
const { Lerper, TYPE_POSITION, TYPE_QUATERNION, TYPE_SCALE } = require('../Lerper')
const { hexToBytes, bytesToHex } = require('../utils')

const tmpPosition = new THREE.Vector3()
const tmpQuaternion = new THREE.Quaternion()

const FBMessage = require('../schema/networked-aframe/message').Message
const FBMessageData = require('../schema/networked-aframe/message-data').MessageData
const FBSceneUpdate = require('../schema/networked-aframe/scene-update').SceneUpdate
const FBFullUpdateData = require('../schema/networked-aframe/full-update-data').FullUpdateData
const FBUpdateOp = require('../schema/networked-aframe/update-op').UpdateOp
const FBDeleteOp = require('../schema/networked-aframe/delete-op').DeleteOp
// const FBCustomOp = require('../schema/networked-aframe/custom-op').CustomOp

const clientIdByteBuf = []
const opOffsetBuf = []
const messageRef = new FBMessage()
const fullUpdateDataRef = new FBFullUpdateData()
const sceneUpdateRef = new FBSceneUpdate()
const updateRef = new FBUpdateOp()
const deleteRef = new FBDeleteOp()
const tmpLong = new Long(0, 0)

const MAX_AWAIT_INSTANTIATION_MS = 10000

const tmpRef = new flexbuffers.toReference(new ArrayBuffer(4)) // eslint-disable-line

// Flatbuffers builder
const flatbuilder = new Builder(1024)

// Flexbuffer builder
const flexbuilder = new flexbuffers.builder() // eslint-disable-line

const tmpTargetClientIds = new Set()

// Don't dedup because we want to re-use builder
flexbuilder.dedupStrings = false
flexbuilder.dedupKeys = false
flexbuilder.dedupKeyVectors = false

const flexbuilderUintView = new Uint8Array(flexbuilder.buffer)
const resetFlexBuilder = () => {
  flexbuilderUintView.fill(0)
  flexbuilder.stack.length = 0
  flexbuilder.stackPointers.length = 0
  flexbuilder.offset = 0
  flexbuilder.finished = false
}

// Map of aframe component name -> sorted attribute list
const aframeSchemaSortedKeys = new Map()

function defaultRequiresUpdate () {
  let cachedData = null

  return (newData) => {
    // Initial call here should just cache existing value since this is for delta chacking
    // after the initial full syncs.
    if (cachedData === null && newData !== null) {
      cachedData = AFRAME.utils.clone(newData)
      return false
    }

    if ((cachedData === null && newData !== null) || !deepEqual(cachedData, newData)) {
      cachedData = AFRAME.utils.clone(newData)
      return true
    }

    return false
  }
}

AFRAME.registerSystem('networked', {
  init () {
    // An array of "networked" component instances.
    this.components = []

    this.reset()

    let running = false

    this.paused = false

    // Main networking loop, doesn't run on RAF
    setInterval(() => {
      if (this.paused || running || !NAF.connection.adapter) return

      running = true
      const now = performance.now()

      try {
        if (now < this.nextSyncTime) return

        for (const component of this.components) {
          component.consumeFirstUpdateIfNecessary()
        }

        if (!this.incomingPaused) this.performReceiveStep()
        this.performSendStep()
      } finally {
        running = false
      }
    }, 1000.0 / 60.0) // 60hz outer loop
  },

  register (component) {
    this.components.push(component)
    this.instantiatingNetworkIds.delete(component.data.networkId)
  },

  deregister (component) {
    const idx = this.components.indexOf(component)

    if (idx > -1) {
      this.components.splice(idx, 1)
    }
  },

  enqueueIncoming (data, sender) {
    this.incomingData.push(data)
    this.incomingSenders.push(sender)
  },

  pause () {
    this.paused = true
  },

  play () {
    this.paused = false
  },

  reset () {
    // Incoming messages and flag to determine if incoming message processing should pause
    this.incomingData = []
    this.incomingSenders = []
    this.incomingPaused = false

    // Set of network ids that had a full sync but have not yet shown up in the set of
    // entities. This avoids processing any messages until it has been instantiated.
    this.instantiatingNetworkIds = new Map()
    this.awaitingPeers = new Map()

    this.nextSyncTime = 0
  },

  performReceiveStep () {
    const { incomingData, incomingSenders } = this

    outer: // eslint-disable-line
    for (let i = 0, l = incomingData.length; i < l; i++) {
      const data = incomingData.shift()
      const sender = incomingSenders.shift()

      FBMessage.getRootAsMessage(new ByteBuffer(data), messageRef)
      messageRef.data(sceneUpdateRef)

      const now = performance.now()

      // Do a pass over the updates first to determine if this message should be skipped + requeued
      for (let i = 0, l = sceneUpdateRef.updatesLength(); i < l; i++) {
        sceneUpdateRef.updates(i, updateRef)

        const networkId = updateRef.networkId()
        const hasInstantiatedEntity = NAF.entities.hasEntity(networkId)
        const isFullSync = updateRef.fullUpdateData(fullUpdateDataRef) != null

        if (!hasInstantiatedEntity) {
          // If rtc peer is not connected yet for a first sync, requeue for MAX_AWAIT_INSTANTIATION_MS.
          if (!NAF.connection.activeDataChannels[sender]) {
            if (!this.awaitingPeers.has(sender) || now - this.awaitingPeers.get(sender) < MAX_AWAIT_INSTANTIATION_MS) {
              if (!this.awaitingPeers.has(sender)) {
                this.awaitingPeers.set(sender, performance.now())
              }

              incomingData.push(data)
              incomingSenders.push(sender)
            }

            continue outer // eslint-disable-line
          }

          // Let through the first full sync for a new entity
          const isFirstFullSync = isFullSync && !this.instantiatingNetworkIds.has(networkId)

          if (isFirstFullSync) {
            // If rtc peer is not connected yet for a first sync, requeue for MAX_AWAIT_INSTANTIATION_MS.
            // Mark entity as instantiating and process it so we don't consume subsequent first syncs.
            this.awaitingPeers.delete(sender)
            this.instantiatingNetworkIds.set(networkId, performance.now())
          } else {
            // Otherwise re-queue or skip if instantiation never showed up after delay.
            //
            // If delay has been met, we just stop re-enqueuing. Instantiation probably failed.
            if (!this.instantiatingNetworkIds.has(networkId) ||
              now - this.instantiatingNetworkIds.get(networkId) < MAX_AWAIT_INSTANTIATION_MS) {
              incomingData.push(data)
              incomingSenders.push(sender)
            }

            continue outer // eslint-disable-line
          }
        }
      }

      for (let i = 0, l = sceneUpdateRef.updatesLength(); i < l; i++) {
        sceneUpdateRef.updates(i, updateRef)
        NAF.entities.updateEntity(updateRef, sender)
      }

      for (let i = 0, l = sceneUpdateRef.deletesLength(); i < l; i++) {
        sceneUpdateRef.deletes(i, deleteRef)
        NAF.entities.removeRemoteEntity(deleteRef, sender)
      }
    }
  },

  performSendStep () {
    let send = false
    let sendGuaranteed = false

    // Target client ids for direct full syncs or will have null if a broadcast
    // of a normal update is needed.
    tmpTargetClientIds.clear()

    for (let i = 0, l = this.components.length; i < l; i++) {
      const c = this.components[i]

      if (!c.isMine()) continue
      if (!c.canSync()) continue
      if (!c.el.parentElement) {
        NAF.log.error('entity registered with system despite being removed')
        // TODO: Find out why tick is still being called
        continue
      }

      let isFull = false

      if (c.pendingFullSyncTargetClients.size > 0) {
        isFull = true

        for (const clientId of c.pendingFullSyncTargetClients) {
          tmpTargetClientIds.add(clientId)
        }

        c.pendingFullSyncTargetClients.clear()
      }

      resetFlexBuilder()

      if (!c.pushComponentsDataToFlexBuilder(isFull)) continue

      if (!send) {
        flatbuilder.clear()
        opOffsetBuf.length = 0
        send = true
      }

      const componentsOffset = FBUpdateOp.createComponentsVector(flatbuilder, new Uint8Array(flexbuilder.finish()))
      const ownerOffset = FBUpdateOp.createOwnerVector(flatbuilder, hexToBytes(c.data.owner, clientIdByteBuf))

      let fullUpdateDataOffset = null

      if (isFull) {
        sendGuaranteed = true

        fullUpdateDataOffset = FBFullUpdateData.createFullUpdateData(flatbuilder,
           FBFullUpdateData.createCreatorVector(flatbuilder, hexToBytes(c.data.creator, clientIdByteBuf)),
           flatbuilder.createSharedString(c.data.template),
           c.data.persistent,
           flatbuilder.createSharedString(c.getParentId())
         )
      } else {
        // Add null client id to ensure a broadcast of partial updates
        tmpTargetClientIds.add(null)
      }

      const networkIdOffset = flatbuilder.createSharedString(c.data.networkId)
      FBUpdateOp.startUpdateOp(flatbuilder)
      FBUpdateOp.addNetworkId(flatbuilder, networkIdOffset)
      FBUpdateOp.addOwner(flatbuilder, ownerOffset)
      tmpLong.low = c.lastOwnerTime & 0x3fffffff
      tmpLong.high = (c.lastOwnerTime - tmpLong.low) / 0x40000000
      FBUpdateOp.addLastOwnerTime(flatbuilder, tmpLong)
      FBUpdateOp.addComponents(flatbuilder, componentsOffset)

      if (fullUpdateDataOffset !== null) {
        FBUpdateOp.addFullUpdateData(flatbuilder, fullUpdateDataOffset)
      }

      opOffsetBuf.push(FBUpdateOp.endUpdateOp(flatbuilder))
    }

    if (send) {
      const updatesOffset = FBSceneUpdate.createUpdatesVector(flatbuilder, opOffsetBuf)
      FBSceneUpdate.startSceneUpdate(flatbuilder)
      FBSceneUpdate.addUpdates(flatbuilder, updatesOffset)
      const sceneUpdateOffset = FBSceneUpdate.endSceneUpdate(flatbuilder)

      flatbuilder.finish(FBMessage.createMessage(
        flatbuilder, FBMessageData.SceneUpdate,
        sceneUpdateOffset
      ))

      if (tmpTargetClientIds.has(null)) {
        NAF.connection.broadcastData(flatbuilder.asUint8Array(), sendGuaranteed)
      } else {
        for (const clientId of tmpTargetClientIds) {
          NAF.connection.sendData(flatbuilder.asUint8Array(), clientId, sendGuaranteed)
        }
      }
    }

    this.updateNextSyncTime()
  },

  updateNextSyncTime () {
    this.nextSyncTime = performance.now() + 1000.0 / NAF.options.updateRate
  }
})

AFRAME.registerComponent('networked', {
  schema: {
    template: {default: ''},
    attachTemplateToLocal: { default: true },
    persistent: { default: false },

    networkId: {default: ''},
    owner: {default: ''},
    creator: {default: ''}
  },

  init: function () {
    this.OWNERSHIP_GAINED = 'ownership-gained'
    this.OWNERSHIP_CHANGED = 'ownership-changed'
    this.OWNERSHIP_LOST = 'ownership-lost'

    this.onOwnershipGainedEvent = {
      el: this.el
    }
    this.onOwnershipChangedEvent = {
      el: this.el
    }
    this.onOwnershipLostEvent = {
      el: this.el
    }

    this.conversionEuler = new THREE.Euler()
    this.conversionEuler.order = 'YXZ'
    this.lerpers = []
    this.pendingFullSyncTargetClients = new Set()
    this.lastErrorLoggedAt = 0
    this.pendingConsumeFirstUpdate = false

    var wasCreatedByNetwork = this.wasCreatedByNetwork()

    this.onConnected = this.onConnected.bind(this)

    this.componentSchemas = NAF.schemas.getComponents(this.data.template)
    this.cachedElements = new Array(this.componentSchemas.length)

    // Maintain a bit that determines if a component has ever been synced out.
    // In cases where we add a component after-the-fact, without this bit we will
    // skip the initial update.
    this.sentFirstComponentSyncs = this.componentSchemas.map(() => false)

    this.networkUpdatePredicates = this.componentSchemas.map(x => (x.requiresNetworkUpdate && x.requiresNetworkUpdate()) || defaultRequiresUpdate())

    // Fill cachedElements array with null elements
    this.invalidateCachedElements()

    this.initNetworkParent()

    let networkId

    if (this.data.networkId === '') {
      networkId = NAF.utils.createNetworkId()
      this.el.setAttribute(this.name, {networkId})
    } else {
      networkId = this.data.networkId
    }

    if (!this.el.id) {
      this.el.setAttribute('id', 'naf-' + networkId)
    }

    if (wasCreatedByNetwork) {
      this.pendingConsumeFirstUpdate = true
    } else {
      if (this.data.attachTemplateToLocal) {
        this.attachTemplateToLocal()
      }
    }

    NAF.entities.registerEntity(networkId, this.el)

    this.lastOwnerTime = 1

    if (NAF.clientId) {
      this.onConnected()
    } else {
      document.body.addEventListener('connected', this.onConnected, false)
    }

    document.body.dispatchEvent(this.entityCreatedEvent())
    this.el.dispatchEvent(new CustomEvent('instantiated', {detail: {el: this.el}}))
    this.el.sceneEl.systems.networked.register(this)
  },

  attachTemplateToLocal: function () {
    const template = NAF.schemas.getCachedTemplate(this.data.template)
    const elAttrs = template.attributes

    // Merge root element attributes with this entity
    for (let attrIdx = 0; attrIdx < elAttrs.length; attrIdx++) {
      this.el.setAttribute(elAttrs[attrIdx].name, elAttrs[attrIdx].value)
    }

    // Append all child elements
    while (template.firstElementChild) {
      this.el.appendChild(template.firstElementChild)
    }
  },

  takeOwnership: function () {
    const owner = this.data.owner
    const lastOwnerTime = this.lastOwnerTime
    const now = NAF.connection.getServerTime()
    if (owner && !this.isMine() && lastOwnerTime < now) {
      this.lastOwnerTime = now
      this.removeLerp()
      this.el.setAttribute('networked', { owner: NAF.clientId })
      this.syncAll()

      this.onOwnershipGainedEvent.oldOwner = owner
      this.el.emit(this.OWNERSHIP_GAINED, this.onOwnershipGainedEvent)

      this.onOwnershipChangedEvent.oldOwner = owner
      this.onOwnershipChangedEvent.newOwner = NAF.clientId
      this.el.emit(this.OWNERSHIP_CHANGED, this.onOwnershipChangedEvent)

      return true
    }
    return false
  },

  wasCreatedByNetwork: function () {
    return !!this.el.firstUpdateRef
  },

  initNetworkParent: function () {
    var parentEl = this.el.parentElement
    if (parentEl.hasOwnProperty('components') && parentEl.components.hasOwnProperty('networked')) {
      this.parent = parentEl
    } else {
      this.parent = null
    }
  },

  consumeFirstUpdateIfNecessary: function () {
    if (!this.pendingConsumeFirstUpdate) return
    this.networkUpdate(this.el.firstUpdateRef, this.data.creator)
    this.pendingConsumeFirstUpdate = false
  },

  onConnected: function () {
    this.positionNormalizer = NAF.entities.positionNormalizer
    this.positionDenormalizer = NAF.entities.positionDenormalizer

    if (this.data.owner === '') {
      // The original owner can be overruled if another person joins the network who took ownership explicitly.
      // This is needed for objects that were loaded as part of a scene.
      this.lastOwnerTime = NAF.connection.getServerTime()
      this.el.setAttribute(this.name, { owner: NAF.clientId, creator: NAF.clientId })
      this.el.object3D.matrixNeedsUpdate = true
      setTimeout(() => {
        // a-primitives attach their components on the next frame; wait for components to be attached before calling syncAll
        if (!this.el.parentNode) {
          NAF.log.warn('Networked element was removed before ever getting the chance to syncAll')
          return
        }
        this.syncAll()
      }, 0)
    }

    document.body.removeEventListener('connected', this.onConnected, false)
  },

  isMine: function () {
    return this.data.owner === NAF.clientId
  },

  createdByMe: function () {
    return this.data.creator === NAF.clientId
  },

  tick: function (time, dt) {
    if (!this.isMine()) {
      for (var i = 0; i < this.lerpers.length; i++) {
        const { lerper, object3D } = this.lerpers[i]

        let pos = tmpPosition
        pos.copy(object3D.position)

        const positionUpdated = lerper.step(TYPE_POSITION, pos)

        if (positionUpdated) {
          if (this.positionDenormalizer) {
            pos = this.positionDenormalizer(pos, object3D.position)
          }

          object3D.position.copy(pos)
        }

        const quaternionUpdated = lerper.step(TYPE_QUATERNION, object3D.quaternion)
        const scaleUpdated = lerper.step(TYPE_SCALE, object3D.scale)

        if (positionUpdated || quaternionUpdated || scaleUpdated) {
          object3D.matrixNeedsUpdate = true
        }
      }
    }
  },

  /* Sending updates */

  syncAll: function (targetClientId = null) {
    if (!this.canSync()) return
    this.pendingFullSyncTargetClients.add(targetClientId)
  },

  getCachedElement (componentSchemaIndex) {
    var cachedElement = this.cachedElements[componentSchemaIndex]

    if (cachedElement) {
      return cachedElement
    }

    var componentSchema = this.componentSchemas[componentSchemaIndex]

    if (componentSchema.selector) {
      const el = this.el.querySelector(componentSchema.selector)
      this.cachedElements[componentSchemaIndex] = el
      return el
    } else {
      this.cachedElements[componentSchemaIndex] = this.el
      return this.el
    }
  },

  invalidateCachedElements () {
    for (var i = 0; i < this.cachedElements.length; i++) {
      this.cachedElements[i] = null
    }
  },

  pushComponentsDataToFlexBuilder: function (fullSync) {
    let hadComponents = false

    for (var i = 0; i < this.componentSchemas.length; i++) {
      const componentSchema = this.componentSchemas[i]
      const componentElement = this.getCachedElement(i)

      if (!componentElement) continue

      const componentName = componentSchema.component ? componentSchema.component : componentSchema
      const componentData = componentElement.getAttribute(componentName)

      if (componentData === null) continue

      const syncedComponentData = componentSchema.property ? componentData[componentSchema.property] : componentData

      // Use networkUpdatePredicate to check if the component needs to be updated.
      // Call networkUpdatePredicate first so that it can update any cached values in the event of a fullSync.
      if (!this.sentFirstComponentSyncs[i] || this.networkUpdatePredicates[i](syncedComponentData) || fullSync) {
        // Components preamble
        if (!hadComponents) {
          flexbuilder.startVector()
        }

        let dataToSync = syncedComponentData

        if (this.positionNormalizer && componentName === 'position') {
          dataToSync = this.positionNormalizer(dataToSync, this.el)
        }

        if (dataToSync !== null) {
          this.sentFirstComponentSyncs[i] = true
          hadComponents = true

          flexbuilder.startVector()
          flexbuilder.addInt(i)

          if (OBJECT3D_COMPONENTS.includes(componentName)) {
            flexbuilder.addFloat(Math.fround(dataToSync.x))
            flexbuilder.addFloat(Math.fround(dataToSync.y))
            flexbuilder.addFloat(Math.fround(dataToSync.z))
          } else {
            if (typeof dataToSync === 'object') {
              if (dataToSync.isVector2) {
                flexbuilder.addInt(0)
                flexbuilder.addFloat(Math.fround(dataToSync.x))
                flexbuilder.addFloat(Math.fround(dataToSync.y))
              } else if (dataToSync.isVector3) {
                flexbuilder.addInt(1)
                flexbuilder.addFloat(Math.fround(dataToSync.x))
                flexbuilder.addFloat(Math.fround(dataToSync.y))
                flexbuilder.addFloat(Math.fround(dataToSync.z))
              } else if (dataToSync.isQuaternion) {
                flexbuilder.addInt(2)
                flexbuilder.addFloat(Math.fround(dataToSync.x))
                flexbuilder.addFloat(Math.fround(dataToSync.y))
                flexbuilder.addFloat(Math.fround(dataToSync.z))
                flexbuilder.addFloat(Math.fround(dataToSync.w))
              } else {
                flexbuilder.addInt(3)

                if (componentSchema.property) {
                  // Only acceptable format here are vec2, 3, 4
                  // We add up to 4 values and end with 255, ordered by x, y, z, w
                  let found = false

                  if (typeof (dataToSync.x) !== 'undefined' && typeof (dataToSync.y) !== 'undefined' && typeof (dataToSync.z) !== 'undefined' && typeof (dataToSync.w) !== 'undefined') {
                    flexbuilder.addInt(0)
                    flexbuilder.add(Math.fround(dataToSync.x))
                    flexbuilder.add(Math.fround(dataToSync.y))
                    flexbuilder.add(Math.fround(dataToSync.z))
                    flexbuilder.add(Math.fround(dataToSync.w))
                    found = true
                  }

                  if (!found && typeof (dataToSync.x) !== 'undefined' && typeof (dataToSync.y) !== 'undefined' && typeof (dataToSync.z) !== 'undefined') {
                    flexbuilder.addInt(1)
                    flexbuilder.add(Math.fround(dataToSync.x))
                    flexbuilder.add(Math.fround(dataToSync.y))
                    flexbuilder.add(Math.fround(dataToSync.z))
                    found = true
                  }

                  if (!found && typeof (dataToSync.x) !== 'undefined' && typeof (dataToSync.y) !== 'undefined') {
                    flexbuilder.addInt(2)
                    flexbuilder.add(Math.fround(dataToSync.x))
                    flexbuilder.add(Math.fround(dataToSync.y))
                    found = true
                  }

                  if (!found) {
                    NAF.warn('Invalid object serialize', dataToSync)
                  }
                } else {
                  if (!aframeSchemaSortedKeys.has(componentName)) {
                    aframeSchemaSortedKeys.set(componentName, [...Object.keys(AFRAME.components[componentName].schema)].sort())
                  }

                  const aframeSchemaKeys = aframeSchemaSortedKeys.get(componentName)

                  for (let j = 0; j <= aframeSchemaKeys.length; j++) {
                    const key = aframeSchemaKeys[j]

                    if (dataToSync[key] !== undefined) {
                      flexbuilder.addInt(j)

                      const value = dataToSync[key]

                      if (typeof value === 'number') {
                        if (Number.isInteger(value)) {
                          if (value > 2147483647 || value < -2147483648) {
                            NAF.log.error('64 bit integers not supported', value, componentSchema)
                          } else {
                            flexbuilder.add(value)
                          }
                        } else {
                          flexbuilder.add(Math.fround(value))
                        }
                      } else {
                        flexbuilder.add(value)
                      }
                    }
                  }

                  flexbuilder.addInt(255) // Terminator
                }
              }
            } else {
              flexbuilder.addInt(4)

              const value = dataToSync

              if (typeof value === 'number') {
                if (Number.isInteger(value)) {
                  if (value > 2147483647 || value < -2147483648) {
                    NAF.log.error('64 bit integers not supported', value, componentSchema)
                  } else {
                    flexbuilder.add(value)
                  }
                } else {
                  flexbuilder.add(Math.fround(value))
                }
              } else {
                flexbuilder.add(value)
              }
            }
          }

          flexbuilder.end()
        }
      }
    }

    if (hadComponents) {
      flexbuilder.end()
    }

    return hadComponents
  },

  canSync: function () {
    // This client will send a sync if:
    //
    // - The client is the owner
    // - The client is the creator, and the owner is not in the room.
    //
    // The reason for the latter case is so the object will still be
    // properly instantiated if the owner leaves. (Since the object lifetime
    // is tied to the creator.)
    if (this.data.owner && this.isMine()) return true
    if (!this.createdByMe()) return false

    const clients = NAF.connection.getConnectedClients()

    for (let clientId in clients) {
      if (clientId === this.data.owner) return false
    }

    return true
  },

  getParentId: function () {
    this.initNetworkParent() // TODO fix calling this each network tick
    if (!this.parent) {
      return null
    }
    var netComp = this.parent.getAttribute('networked')
    return netComp.networkId
  },

  /* Receiving updates */

  networkUpdate: function (updateRef, sender) {
    try {
      clientIdByteBuf.length = 20
      for (let i = 0; i < 20; i++) {
        clientIdByteBuf[i] = updateRef.owner(i)
      }

      const entityDataOwner = bytesToHex(clientIdByteBuf)
      const ownerTimeLong = updateRef.lastOwnerTime()
      const entityDataLastOwnerTime = ownerTimeLong.high * 0x40000000 + ownerTimeLong.low

      // Avoid updating components if the entity data received did not come from the current owner.
      if (entityDataLastOwnerTime < this.lastOwnerTime ||
            (this.lastOwnerTime === entityDataLastOwnerTime && this.data.owner > entityDataOwner)) {
        return
      }

      const isFullSync = updateRef.fullUpdateData(fullUpdateDataRef) != null

      if (isFullSync && this.data.owner !== entityDataOwner) {
        var wasMine = this.isMine()
        this.lastOwnerTime = entityDataLastOwnerTime

        const oldOwner = this.data.owner
        const newOwner = entityDataOwner

        this.el.setAttribute('networked', { owner: entityDataOwner })

        if (wasMine) {
          this.onOwnershipLostEvent.newOwner = newOwner
          this.el.emit(this.OWNERSHIP_LOST, this.onOwnershipLostEvent)
        }
        this.onOwnershipChangedEvent.oldOwner = oldOwner
        this.onOwnershipChangedEvent.newOwner = newOwner
        this.el.emit(this.OWNERSHIP_CHANGED, this.onOwnershipChangedEvent)
      }
      if (isFullSync && this.data.persistent !== fullUpdateDataRef.persistent()) {
        this.el.setAttribute('networked', { persistent: fullUpdateDataRef.persistent() })
      }

      const componentArray = updateRef.componentsArray()
      const dataView = new DataView(componentArray.buffer, componentArray.byteOffset, componentArray.byteLength)
      const len = dataView.byteLength
      const byteWidth = dataView.getUint8(len - 1)
      const packedType = dataView.getUint8(len - 2)
      const parentWidth = fromByteWidth(byteWidth)
      const offset = len - byteWidth - 2
      const entityDataRef = new Reference(dataView, offset, parentWidth, packedType, '/')

      this.updateNetworkedComponents(entityDataRef, isFullSync, sender)
    } catch (e) {
      const now = performance.now()

      if (now - this.lastErrorLoggedAt > 1000) {
        this.lastErrorLoggedAt = now
        NAF.log.error('Error updating from network', sender, updateRef && updateRef.bb && updateRef.bb.bytes, e)
      }
    }
  },

  updateNetworkedComponents: function (entityDataRef, isFullSync, sender) {
    this.startLerpingFrame()

    const len = entityDataRef.length()

    for (let iData = 0; iData < len; iData++) {
      const componentDataRef = tmpRef
      refCp(entityDataRef, componentDataRef)
      refAdvanceToIndexGet(componentDataRef, iData)
      const componentIndex = refGetInt(componentDataRef, 0)
      const componentSchema = this.componentSchemas[componentIndex]
      const el = this.getCachedElement(componentIndex)

      if (el === null) continue

      const componentName = componentSchema.component ? componentSchema.component : componentSchema

      if (!OBJECT3D_COMPONENTS.includes(componentName)) {
        const type = refGetInt(componentDataRef, 1)

        switch (type) {
          case 0: // Vector2
            el.setAttribute(componentName, { [componentSchema.property]: new THREE.Vector2(
              refGetNumeric(componentDataRef, 2) || 0,
              refGetNumeric(componentDataRef, 3) || 0
            ) })
            break
          case 1: // Vector3
            el.setAttribute(componentName, { [componentSchema.property]: new THREE.Vector3(
              refGetNumeric(componentDataRef, 2) || 0,
              refGetNumeric(componentDataRef, 3) || 0,
              refGetNumeric(componentDataRef, 4) || 0
            ) })
            break
          case 2: // Quaternion
            el.setAttribute(componentName, { [componentSchema.property]: new THREE.Quaternion(
              refGetNumeric(componentDataRef, 2) || 0,
              refGetNumeric(componentDataRef, 3) || 0,
              refGetNumeric(componentDataRef, 4) || 0,
              refGetNumeric(componentDataRef, 5) || 0
            ) })
            break
          case 3:
            // Object
            if (componentSchema.property) {
              let objectValue = {}

              // This is a aframe vec2, vec3, vec4
              switch (refGetInt(componentDataRef, 2)) {
                case (0): // vec4
                  objectValue.x = refGetNumeric(componentDataRef, 3) || 0
                  objectValue.y = refGetNumeric(componentDataRef, 4) || 0
                  objectValue.z = refGetNumeric(componentDataRef, 5) || 0
                  objectValue.w = refGetNumeric(componentDataRef, 6) || 0
                  break
                case (1): // vec3
                  objectValue.x = refGetNumeric(componentDataRef, 3) || 0
                  objectValue.y = refGetNumeric(componentDataRef, 4) || 0
                  objectValue.z = refGetNumeric(componentDataRef, 5) || 0
                  break
                case (2): // vec2
                  objectValue.x = refGetNumeric(componentDataRef, 3) || 0
                  objectValue.y = refGetNumeric(componentDataRef, 4) || 0
                  break
              }

              const attributeValue = { [componentSchema.property]: objectValue }

              if (NAF.connection.adapter.sanitizeComponentValues(this.el, componentName, attributeValue, sender)) {
                el.setAttribute(componentName, attributeValue)
              }
            } else {
              if (!aframeSchemaSortedKeys.has(componentName)) {
                const schema = AFRAME.components[componentName].schema

                if (schema.default) {
                  aframeSchemaSortedKeys.set(componentName, [])
                } else {
                  aframeSchemaSortedKeys.set(componentName, [...Object.keys(AFRAME.components[componentName].schema)].sort())
                }
              }

              const aframeSchemaKeys = aframeSchemaSortedKeys.get(componentName)

              let offset = 2
              let keyIndex = refGetInt(componentDataRef, offset)
              let attributeValue = {}

              while (keyIndex !== 255 && offset < 1024) {
                const value = refGetToObject(componentDataRef, offset + 1)

                if (aframeSchemaKeys.length === 0) {
                // default value case
                  attributeValue = value
                  break
                } else {
                  attributeValue[aframeSchemaKeys[keyIndex]] = value
                }

                offset += 2
                keyIndex = refGetInt(componentDataRef, offset)
              }

              if (NAF.connection.adapter.sanitizeComponentValues(this.el, componentName, attributeValue, sender)) {
                el.setAttribute(componentName, attributeValue)
              }
            }
            break
          case 4: {
              // Value
            const attributeValue = { [componentSchema.property]: refGetToObject(componentDataRef, 2) }

            if (NAF.connection.adapter.sanitizeComponentValues(this.el, componentName, attributeValue, sender)) {
              el.setAttribute(componentName, attributeValue)
            }
          }
            break
        }
      } else {
        if (NAF.connection.adapter.authorizeEntityManipulation(this.el, sender)) {
          const x = refGetNumeric(componentDataRef, 1) || 0
          const y = refGetNumeric(componentDataRef, 2) || 0
          const z = refGetNumeric(componentDataRef, 3) || 0

          let lerper

          for (let i = 0, l = this.lerpers.length; i < l; i++) {
            const info = this.lerpers[i]

            if (info.object3D === el.object3D) {
              lerper = info.lerper
              break
            }
          }

          if (!lerper) {
            lerper = new Lerper(NAF.options.updateRate, NAF.options.maxLerpDistance)
            this.lerpers.push({ lerper, object3D: el.object3D })
            lerper.startFrame()
          }

          switch (componentName) {
            case 'position':
              lerper.setPosition(x, y, z)
              break
            case 'rotation':
              this.conversionEuler.set(DEG2RAD * x, DEG2RAD * y, DEG2RAD * z)
              tmpQuaternion.setFromEuler(this.conversionEuler)
              lerper.setQuaternion(tmpQuaternion.x, tmpQuaternion.y, tmpQuaternion.z, tmpQuaternion.w)
              break
            case 'scale':
              lerper.setScale(x, y, z)
              break
            default:
              NAF.log.error('Could not set value in interpolation buffer.', el, componentName, x, y, z)
              break
          }
        }
      }
    }
  },

  startLerpingFrame: function () {
    if (!this.lerpers) return

    for (let i = 0; i < this.lerpers.length; i++) {
      this.lerpers[i].lerper.startFrame()
    }
  },

  removeLerp: function () {
    this.lerpers = []
  },

  remove: function () {
    if (this.isMine() && NAF.connection.isConnected()) {
      if (NAF.entities.hasEntity(this.data.networkId)) {
        flatbuilder.clear()
        const networkIdOffset = flatbuilder.createString(this.data.networkId)
        const deleteOffset = FBDeleteOp.createDeleteOp(flatbuilder, networkIdOffset)
        const deletesOffset = FBSceneUpdate.createDeletesVector(flatbuilder, [deleteOffset])
        FBSceneUpdate.startSceneUpdate(flatbuilder)
        FBSceneUpdate.addDeletes(flatbuilder, deletesOffset)
        const sceneUpdateOffset = FBSceneUpdate.endSceneUpdate(flatbuilder)

        flatbuilder.finish(FBMessage.createMessage(
          flatbuilder, FBMessageData.SceneUpdate,
          sceneUpdateOffset
        ))

        NAF.connection.broadcastDataGuaranteed(flatbuilder.asUint8Array())
      } else {
        NAF.log.error('Removing networked entity that is not in entities array.')
      }
    }
    NAF.entities.forgetEntity(this.data.networkId)
    document.body.dispatchEvent(this.entityRemovedEvent(this.data.networkId))
    this.el.sceneEl.systems.networked.deregister(this)
  },

  entityCreatedEvent () {
    return new CustomEvent('entityCreated', {detail: {el: this.el}})
  },

  entityRemovedEvent (networkId) {
    return new CustomEvent('entityRemoved', {detail: {networkId: networkId}})
  }
})

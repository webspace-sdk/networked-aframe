/* global AFRAME, NAF, CustomEvent, fetch */

const { Builder } = require('flatbuffers/js/builder')
const { encode: messagepackEncode } = require('messagepack')
const { ByteBuffer } = require('flatbuffers/js/byte-buffer')
const Y = require('yjs')
const { encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } = require('y-protocols/awareness')

var ReservedDataType = { Update: 'u', Remove: 'r' }

// Flatbuffers builder
const flatbuilder = new Builder(1024)

const FBMessage = require('./schema/networked-aframe/message').Message
const FBCustomOp = require('./schema/networked-aframe/custom-op').CustomOp
const FBMessageData = require('./schema/networked-aframe/message-data').MessageData
const FBDocSyncRequest = require('./schema/networked-aframe/doc-sync-request').DocSyncRequest
const FBDocSyncResponse = require('./schema/networked-aframe/doc-sync-response').DocSyncResponse
const FBDocUpdate = require('./schema/networked-aframe/doc-update').DocUpdate
const FBPresenceUpdate = require('./schema/networked-aframe/presence-update').PresenceUpdate

const messageRef = new FBMessage()
const docSyncRequestRef = new FBDocSyncRequest()
const docSyncResponseRef = new FBDocSyncResponse()
const docUpdateRef = new FBDocUpdate()
const presenceUpdateRef = new FBPresenceUpdate()
const customRef = new FBCustomOp()

const { decode: messagepackDecode } = require('messagepack')

const NUMBER_OF_SERVER_TIME_REQUESTS = 5

const presenceClientIdforNafClientId = (presence, nafClientId) => {
  for (const [presenceClientId, { clientId }] of presence.states.entries()) {
    if (clientId === nafClientId) return presenceClientId
  }

  return null
}

class NetworkConnection {
  constructor (networkEntities) {
    this.entities = networkEntities
    this.dataChannelSubs = {}

    this.activeDataChannels = {}

    this._avgTimeOffset = 0
    this._serverTimeRequests = 0
    this._timeOffsets = []

    this._onDocUpdate = this._onDocUpdate.bind(this)
    this._onPresenceUpdate = this._onPresenceUpdate.bind(this)
  }

  setNetworkAdapter (adapter) {
    this.adapter = adapter
  }

  connect (appName, roomName, doc, presence, enableAudio = false) {
    NAF.app = appName
    NAF.room = roomName
    NAF.doc = doc
    NAF.presence = presence

    this.doc = doc
    this.presence = presence

    this.doc.on('update', this._onDocUpdate)
    this.presence.on('update', this._onPresenceUpdate)

    this.adapter.setApp(appName)

    this.adapter.setServerConnectListeners(
      this.connectSuccess.bind(this),
      this.connectFailure.bind(this)
    )

    this.adapter.setDataChannelListeners(
      this.dataChannelOpen.bind(this),
      this.dataChannelClosed.bind(this),
      this.receivedData.bind(this)
    )

    return this.updateTimeOffset()
      .then(() => this.adapter.connect())
      .then(() => this.adapter.joinRoom(roomName))
  }

  onConnect (callback) {
    this.onConnectCallback = callback

    if (this.isConnected()) {
      callback()
    } else {
      document.body.addEventListener('connected', callback, false)
    }
  }

  connectSuccess (clientId) {
    NAF.log.write('Networked-Aframe Client ID:', clientId)
    NAF.clientId = clientId

    this.presence.setLocalState({ clientId })

    var evt = new CustomEvent('connected', {'detail': { clientId: clientId }})
    document.body.dispatchEvent(evt)
  }

  connectFailure (errorCode, message) {
    NAF.log.error(errorCode, 'failure to connect')
  }

  getConnectedClients () {
    return this.adapter.getConnectedClients()
  }

  isConnected () {
    return !!NAF.clientId
  }

  isMineAndConnected (clientId) {
    return this.isConnected() && NAF.clientId === clientId
  }

  isNewClient (clientId) {
    return !this.isConnectedTo(clientId)
  }

  isConnectedTo (clientId) {
    return this.adapter.getConnectStatus(clientId) === NAF.adapters.IS_CONNECTED
  }

  dataChannelOpen (clientId) {
    NAF.log.write('Opened data channel from ' + clientId)
    this.activeDataChannels[clientId] = true
    this.entities.completeSync(clientId, true)
    this.sendDocSyncRequest(clientId)
    this.sendPresenceUpdate(clientId)

    document.body.dispatchEvent(new CustomEvent('clientConnected', {detail: {clientId: clientId}}))
  }

  dataChannelClosed (clientId) {
    NAF.log.write('Closed data channel from ' + clientId)
    this.activeDataChannels[clientId] = false
    this.entities.removeEntitiesOfClient(clientId)

    const presenceId = presenceClientIdforNafClientId(this.presence, clientId)

    if (presenceId) {
      removeAwarenessStates(this.presence, [presenceId], 'disconnect')
    }

    var evt = new CustomEvent('clientDisconnected', {detail: {clientId: clientId}})
    document.body.dispatchEvent(evt)
  }

  hasActiveDataChannel (clientId) {
    return this.activeDataChannels.hasOwnProperty(clientId) && this.activeDataChannels[clientId]
  }

  broadcastData (data, guaranteed = false) {
    if (guaranteed) {
      this.adapter.broadcastDataGuaranteed(data)
    } else {
      this.adapter.broadcastData(data)
    }
  }

  broadcastDataGuaranteed (data) {
    this.adapter.broadcastDataGuaranteed(data)
  }

  broadcastCustomData (dataType, customData, guaranteed) {
    this.fillBuilderWithCustomData(dataType, customData)

    if (guaranteed) {
      NAF.connection.broadcastDataGuaranteed(flatbuilder.asUint8Array())
    } else {
      NAF.connection.broadcastData(flatbuilder.asUint8Array())
    }
  }

  broadcastCustomDataGuaranteed (dataType, customData) {
    this.broadcastCustomData(dataType, customData, true)
  }

  sendData (data, toClientId, guaranteed = false) {
    if (this.hasActiveDataChannel(toClientId)) {
      if (guaranteed) {
        this.adapter.sendDataGuaranteed(data, toClientId)
      } else {
        this.adapter.sendData(data, toClientId)
      }
    } else {
      // console.error("NOT-CONNECTED", "not connected to " + toClient);
    }
  }

  sendDataGuaranteed (data, toClientId) {
    this.sendData(data, toClientId, true)
  }

  fillBuilderWithCustomData (dataType, customData) {
    flatbuilder.clear()

    const customOffset = FBCustomOp.createCustomOp(flatbuilder,
      flatbuilder.createSharedString(dataType),
      FBCustomOp.createPayloadVector(flatbuilder, messagepackEncode(customData))
    )

    flatbuilder.finish(FBMessage.createMessage(
      flatbuilder, FBMessageData.CustomOp, customOffset
    ))
  }

  sendCustomData (dataType, customData, toClientId, guaranteed = false) {
    this.fillBuilderWithCustomData(dataType, customData)

    if (guaranteed) {
      NAF.connection.sendDataGuaranteed(flatbuilder.asUint8Array(), toClientId)
    } else {
      NAF.connection.sendData(flatbuilder.asUint8Array(), toClientId)
    }
  }

  sendCustomDataGuaranteed (dataType, customData, toClientId) {
    this.sendCustomData(dataType, customData, toClientId, true)
  }

  subscribeToDataChannel (dataType, callback) {
    this.dataChannelSubs[dataType] = callback
  }

  unsubscribeToDataChannel (dataType) {
    delete this.dataChannelSubs[dataType]
  }

  isReservedDataType (dataType) {
    return dataType === ReservedDataType.Update ||
        dataType === ReservedDataType.Remove
  }

  // Returns true if a new entity was created
  receivedData (data, sender) {
    const { presence, doc, adapter } = this

    FBMessage.getRootAsMessage(new ByteBuffer(data), messageRef)

    switch (messageRef.dataType()) {
      case FBMessageData.SceneUpdate: {
        AFRAME.scenes[0].systems.networked.enqueueIncoming(data, sender)
        break
      }
      case FBMessageData.PresenceUpdate: {
        messageRef.data(presenceUpdateRef)
        applyAwarenessUpdate(presence, presenceUpdateRef.updateArray(), sender)
        break
      }
      case FBMessageData.DocSyncRequest: {
        messageRef.data(docSyncRequestRef)
        const stateVector = docSyncRequestRef.encodedStateVectorArray()
        const update = Y.encodeStateAsUpdate(doc, stateVector)

        flatbuilder.clear()
        flatbuilder.finish(
          FBMessage.createMessage(flatbuilder, FBMessageData.DocSyncResponse,
            FBDocSyncResponse.createDocSyncResponse(flatbuilder,
              FBDocSyncResponse.createUpdateVector(flatbuilder, update)
            )
          )
        )

        adapter.sendDataGuaranteed(flatbuilder.asUint8Array(), sender)

        break
      }
      case FBMessageData.DocSyncResponse: {
        messageRef.data(docSyncResponseRef)
        Y.applyUpdate(doc, docSyncResponseRef.updateArray())

        break
      }
      case FBMessageData.DocUpdate: {
        messageRef.data(docUpdateRef)
        Y.applyUpdate(doc, docUpdateRef.updateArray())

        break
      }
      case FBMessageData.CustomOp: {
        messageRef.data(customRef)
        const dataType = customRef.dataType()

        if (NAF.connection.dataChannelSubs[dataType]) {
          NAF.connection.dataChannelSubs[dataType](dataType, messagepackDecode(customRef.payloadArray()), sender)
        }
        break
      }
    }
  }

  getServerTime () {
    return Date.now() + this._avgTimeOffset
  }

  disconnect () {
    this.entities.removeRemoteEntities()
    this.adapter.disconnect()

    NAF.app = ''
    NAF.room = ''
    NAF.clientId = ''
    this.activeDataChannels = {}
    this.adapter = null
    this.adapter = null
    AFRAME.scenes[0].systems.networked.reset()

    if (this.doc) {
      this.doc.off('update', this._onDocUpdate)
    }

    if (this.presence) {
      this.presence.off('update', this._onPresenceUpdate)
    }

    document.body.removeEventListener('connected', this.onConnectCallback)
  }

  updateTimeOffset () {
    return new Promise(resolve => {
      const clientSentTime = Date.now()

      fetch(document.location.href, {
        method: 'HEAD',
        cache: 'no-cache'
      }).then(res => {
        const precision = 1000
        const serverReceivedTime = new Date(res.headers.get('Date')).getTime() + precision / 2
        const clientReceivedTime = Date.now()
        const serverTime = serverReceivedTime + (clientReceivedTime - clientSentTime) / 2
        const timeOffset = serverTime - clientReceivedTime

        this._serverTimeRequests++

        if (this._serverTimeRequests <= NUMBER_OF_SERVER_TIME_REQUESTS) {
          this._timeOffsets.push(timeOffset)
        } else {
          this._timeOffsets[this._serverTimeRequests % 10] = timeOffset
        }

        this._avgTimeOffset = Math.floor(
          this._timeOffsets.reduce((acc, offset) => (acc += offset), 0) / this._timeOffsets.length
        )

        if (this._serverTimeRequests > 10) {
          setTimeout(() => this.updateTimeOffset(), 5 * 60 * 1000) // Sync clock every 5 minutes.
          this._serverTimeRequests = 0
          this._timeOffsets.length = 0
          resolve()
        } else {
          this.updateTimeOffset().then(resolve)
        }
      })
    })
  }

  sendDocSyncRequest (toClientId) {
    flatbuilder.clear()

    const encodedStateVector = Y.encodeStateVector(this.doc)

    flatbuilder.finish(
        FBMessage.createMessage(flatbuilder, FBMessageData.DocSyncRequest,
          FBDocSyncRequest.createDocSyncRequest(flatbuilder,
            FBDocSyncRequest.createEncodedStateVectorVector(flatbuilder, encodedStateVector)
          )
        )
      )

    this.adapter.sendDataGuaranteed(flatbuilder.asUint8Array(), toClientId)
  }

  sendPresenceUpdate (toClientId) {
    flatbuilder.clear()

    flatbuilder.finish(
        FBMessage.createMessage(flatbuilder, FBMessageData.PresenceUpdate,
          FBPresenceUpdate.createPresenceUpdate(flatbuilder,
            FBPresenceUpdate.createUpdateVector(flatbuilder,
encodeAwarenessUpdate(this.presence, Array.from(this.presence.getStates().keys())))
          )
        )
      )

    this.adapter.sendDataGuaranteed(flatbuilder.asUint8Array(), toClientId)
  }

  _onDocUpdate (update, origin) {
    if (origin !== this) return

    flatbuilder.clear()
    flatbuilder.finish(
      FBMessage.createMessage(flatbuilder, FBMessageData.DocUpdate,
        FBDocUpdate.createDocUpdate(flatbuilder,
          FBDocUpdate.createUpdateVector(flatbuilder, update)
        )
      )
    )

    this.adapter.broadcastDataGuaranteed(flatbuilder.asUint8Array())
  }

  _onPresenceUpdate ({ added, updated, removed }, origin) {
    if (origin !== 'local') return

    const { presence, adapter } = this

    const changedClients = added.concat(updated).concat(removed)
    const update = encodeAwarenessUpdate(presence, changedClients)

    flatbuilder.clear()
    flatbuilder.finish(
      FBMessage.createMessage(flatbuilder, FBMessageData.PresenceUpdate,
        FBPresenceUpdate.createPresenceUpdate(flatbuilder,
          FBPresenceUpdate.createUpdateVector(flatbuilder, update)
        )
      )
    )

    adapter.broadcastDataGuaranteed(flatbuilder.asUint8Array())
  }
}

module.exports = NetworkConnection

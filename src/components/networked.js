/* global AFRAME, NAF, THREE */
const flexbuffers = require('flatbuffers/js/flexbuffers');
const { refCp, refGetNumeric, refGetInt, refGetToObject, refAdvanceToIndexGet, refGetBool, refGetUuidBytes } = require('../FlexBufferUtils');
const uuid = require("uuid")
const deepEqual = require('../DeepEquals');
const DEG2RAD = THREE.Math.DEG2RAD;
const OBJECT3D_COMPONENTS = ['position', 'rotation', 'scale'];
const { Lerper, TYPE_POSITION, TYPE_QUATERNION, TYPE_SCALE } = require('../Lerper');

const tmpPosition = new THREE.Vector3();
const tmpQuaternion = new THREE.Quaternion();
const BASE_OWNER_TIME = 1636600000000;

const uuidByteBuf = [];
const tmpRef = new flexbuffers.toReference(new ArrayBuffer(4));

// Flexbuffer
const builder = new flexbuffers.builder();

// Don't dedup because we want to re-use builder
builder.dedupStrings = false;
builder.dedupKeys = false;
builder.dedupKeyVectors = false;

const builderUintView = new Uint8Array(builder.buffer);
const resetBuilder = () => {
  builderUintView.fill(0);
  builder.stack.length = 0;
  builder.stackPointers.length = 0;
  builder.offset = 0;
  builder.finished = false;
};

// Map of aframe component name -> sorted attribute list
const aframeSchemaSortedKeys = new Map();

const arrayBufferToBase64 = ( buffer ) => {
    let binary = '';
    const bytes = new Uint8Array( buffer );
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
};

function defaultRequiresUpdate() {
  let cachedData = null;

  return (newData) => {
    // Initial call here should just cache existing value since this is for delta chacking
    // after the initial full syncs.
    if (cachedData === null && newData !== null) {
      cachedData = AFRAME.utils.clone(newData);
      return false;
    }

    if ((cachedData === null && newData !== null) || !deepEqual(cachedData, newData)) {
      cachedData = AFRAME.utils.clone(newData);
      return true;
    }

    return false;
  };
}

AFRAME.registerSystem("networked", {
  init() {
    // An array of "networked" component instances.
    this.components = [];
    this.nextSyncTime = 0;
  },

  register(component) {
    this.components.push(component);
  },

  deregister(component) {
    const idx = this.components.indexOf(component);

    if (idx > -1) {
      this.components.splice(idx, 1);
    }
  },

  tick: (function() {

    return function() {
      if (!NAF.connection.adapter) return;
      if (this.el.clock.elapsedTime < this.nextSyncTime) return;

      resetBuilder();
      builder.startVector();
      builder.add(true); // is update
      builder.add(false); // is full

      let send = false;

      for (let i = 0, l = this.components.length; i < l; i++) {
        const c = this.components[i];
        if (!c.isMine()) continue;
        if (!c.canSync()) continue;
        if (!c.el.parentElement) {
          NAF.log.error("entity registered with system despite being removed");
          //TODO: Find out why tick is still being called
          continue;
        }

        if (!c.pushComponentsDataToBuilder(false)) continue;
        send = true;
      }

      builder.end();

      if (send) {
        const buf = builder.finish().buffer;
        NAF.connection.broadcastData(arrayBufferToBase64(buf));
      }

      this.updateNextSyncTime();
    };
  })(),

  updateNextSyncTime() {
    this.nextSyncTime = this.el.clock.elapsedTime + 1 / NAF.options.updateRate;
  }
});

AFRAME.registerComponent('networked', {
  schema: {
    template: {default: ''},
    attachTemplateToLocal: { default: true },
    persistent: { default: false },

    networkId: {default: ''},
    owner: {default: ''},
    creator: {default: ''}
  },

  init: function() {
    this.OWNERSHIP_GAINED = 'ownership-gained';
    this.OWNERSHIP_CHANGED = 'ownership-changed';
    this.OWNERSHIP_LOST = 'ownership-lost';

    this.onOwnershipGainedEvent = {
      el: this.el
    };
    this.onOwnershipChangedEvent = {
      el: this.el
    };
    this.onOwnershipLostEvent = {
      el: this.el
    };

    this.conversionEuler = new THREE.Euler();
    this.conversionEuler.order = "YXZ";
    this.lerpers = [];

    var wasCreatedByNetwork = this.wasCreatedByNetwork();

    this.onConnected = this.onConnected.bind(this);

    this.componentSchemas =  NAF.schemas.getComponents(this.data.template);
    this.cachedElements = new Array(this.componentSchemas.length);
    this.networkUpdatePredicates = this.componentSchemas.map(x => (x.requiresNetworkUpdate && x.requiresNetworkUpdate()) || defaultRequiresUpdate());

    // Fill cachedElements array with null elements
    this.invalidateCachedElements();

    this.initNetworkParent();

    let networkId;

    if (this.data.networkId === '') {
      networkId = NAF.utils.createNetworkId()
      this.el.setAttribute(this.name, {networkId});
    } else {
      networkId = this.data.networkId;
    }

    if (!this.el.id) {
      this.el.setAttribute('id', 'naf-' + networkId);
    }

    if (wasCreatedByNetwork) {
      this.firstUpdate();
    } else {
      if (this.data.attachTemplateToLocal) {
        this.attachTemplateToLocal();
      }

      this.registerEntity(this.data.networkId);
    }

    this.lastOwnerTime = -1;

    if (NAF.clientId) {
      this.onConnected();
    } else {
      document.body.addEventListener('connected', this.onConnected, false);
    }

    document.body.dispatchEvent(this.entityCreatedEvent());
    this.el.dispatchEvent(new CustomEvent('instantiated', {detail: {el: this.el}}));
    this.el.sceneEl.systems.networked.register(this);
  },

  attachTemplateToLocal: function() {
    const template = NAF.schemas.getCachedTemplate(this.data.template);
    const elAttrs = template.attributes;

    // Merge root element attributes with this entity
    for (let attrIdx = 0; attrIdx < elAttrs.length; attrIdx++) {
      this.el.setAttribute(elAttrs[attrIdx].name, elAttrs[attrIdx].value);
    }

    // Append all child elements
    while (template.firstElementChild) {
      this.el.appendChild(template.firstElementChild);
    }
  },

  takeOwnership: function() {
    const owner = this.data.owner;
    const lastOwnerTime = this.lastOwnerTime;
    const now = NAF.connection.getServerTime();
    if (owner && !this.isMine() && lastOwnerTime < now) {
      this.lastOwnerTime = now;
      this.removeLerp();
      this.el.setAttribute('networked', { owner: NAF.clientId });
      this.syncAll();

      this.onOwnershipGainedEvent.oldOwner = owner;
      this.el.emit(this.OWNERSHIP_GAINED, this.onOwnershipGainedEvent);

      this.onOwnershipChangedEvent.oldOwner = owner;
      this.onOwnershipChangedEvent.newOwner = NAF.clientId;
      this.el.emit(this.OWNERSHIP_CHANGED, this.onOwnershipChangedEvent);

      return true;
    }
    return false;
  },

  wasCreatedByNetwork: function() {
    return !!this.el.firstUpdateDataRef;
  },

  initNetworkParent: function() {
    var parentEl = this.el.parentElement;
    if (parentEl.hasOwnProperty('components') && parentEl.components.hasOwnProperty('networked')) {
      this.parent = parentEl;
    } else {
      this.parent = null;
    }
  },

  registerEntity: function(networkId) {
    NAF.entities.registerEntity(networkId, this.el);
  },

  applyPersistentFirstSync: function() {
    const { networkId } = this.data;
    const persistentFirstSyncEntityDataRef = NAF.entities.getPersistentFirstSync(networkId);
    if (persistentFirstSyncEntityDataRef) {
      // Can presume offset zero for first full sync
      this.networkUpdate(persistentFirstSyncEntityDataRef, true);
      NAF.entities.forgetPersistentFirstSync(networkId);
    }
  },

  firstUpdate: function() {
    this.networkUpdate(this.el.firstUpdateDataRef, true);
  },

  onConnected: function() {
    this.positionNormalizer = NAF.entities.positionNormalizer;
    this.positionDenormalizer = NAF.entities.positionDenormalizer;

    if (this.data.owner === '') {
      this.lastOwnerTime = NAF.connection.getServerTime();
      this.el.setAttribute(this.name, { owner: NAF.clientId, creator: NAF.clientId });
      this.el.object3D.matrixNeedsUpdate = true;
      setTimeout(() => {
        //a-primitives attach their components on the next frame; wait for components to be attached before calling syncAll
        if (!this.el.parentNode){
          NAF.log.warn("Networked element was removed before ever getting the chance to syncAll");
          return;
        }
        this.syncAll(undefined, true);
      }, 0);
    }

    document.body.removeEventListener('connected', this.onConnected, false);
  },

  isMine: function() {
    return this.data.owner === NAF.clientId;
  },

  createdByMe: function() {
    return this.data.creator === NAF.clientId;
  },

  tick: function(time, dt) {
    if (!this.isMine()) {
      for (var i = 0; i < this.lerpers.length; i++) {
        const { lerper, object3D } = this.lerpers[i];

        let pos = tmpPosition;
        pos.copy(object3D.position);

        const positionUpdated = lerper.step(TYPE_POSITION, pos);

        if (positionUpdated) {
          if (this.positionDenormalizer) {
            pos = this.positionDenormalizer(pos, object3D.position);
          }

          object3D.position.copy(pos);
        }

        const quaternionUpdated = lerper.step(TYPE_QUATERNION, object3D.quaternion);
        const scaleUpdated = lerper.step(TYPE_SCALE, object3D.scale);

        if (positionUpdated || quaternionUpdated || scaleUpdated) {
          object3D.matrixNeedsUpdate = true;
        }
      }
    }
  },

  /* Sending updates */

  syncAll: function(targetClientId, isFirstSync) {
    if (!this.canSync()) {
      return;
    }

    resetBuilder();
    builder.startVector();
    builder.add(true); // is update
    builder.add(true); // is full

    // Components
    this.pushComponentsDataToBuilder(true);

    builder.end();

    if (targetClientId) {
      NAF.connection.sendDataGuaranteed(targetClientId, arrayBufferToBase64(builder.finish()));
    } else {
      NAF.connection.broadcastDataGuaranteed(arrayBufferToBase64(builder.finish()));
    }
  },

  getCachedElement(componentSchemaIndex) {
    var cachedElement = this.cachedElements[componentSchemaIndex];

    if (cachedElement) {
      return cachedElement;
    }

    var componentSchema = this.componentSchemas[componentSchemaIndex];

    if (componentSchema.selector) {
      return this.cachedElements[componentSchemaIndex] = this.el.querySelector(componentSchema.selector);
    } else {
      return this.cachedElements[componentSchemaIndex] = this.el;
    }
  },

  invalidateCachedElements() {
    for (var i = 0; i < this.cachedElements.length; i++) {
      this.cachedElements[i] = null;
    }
  },

  pushComponentsDataToBuilder: function(fullSync) {
    let hadComponents = false;

    for (var i = 0; i < this.componentSchemas.length; i++) {
      const componentSchema = this.componentSchemas[i];
      const componentElement = this.getCachedElement(i);

      if (!componentElement) continue;

      const componentName = componentSchema.component ? componentSchema.component : componentSchema;
      const componentData = componentElement.getAttribute(componentName);

      if (componentData === null) continue;

      const syncedComponentData = componentSchema.property ? componentData[componentSchema.property] : componentData;

      // Use networkUpdatePredicate to check if the component needs to be updated.
      // Call networkUpdatePredicate first so that it can update any cached values in the event of a fullSync.
      if (this.networkUpdatePredicates[i](syncedComponentData) || fullSync) {
        // Components preamble
        if (!hadComponents) {
          builder.startVector();
          builder.add(this.data.networkId);
          builder.add([...uuid.parse(this.data.owner)]);
          builder.add(this.lastOwnerTime - BASE_OWNER_TIME); // 32 bits

          if (fullSync) {
            // Full preamble
            builder.add([...uuid.parse(this.data.creator)]);
            builder.add(this.data.template);
            builder.add(this.data.persistent);
            builder.add(this.getParentId());
          }
        }

        hadComponents = true;

        let dataToSync = syncedComponentData;

        if (this.positionNormalizer && componentName === "position") {
          dataToSync = this.positionNormalizer(dataToSync, this.el);
        }

        builder.startVector();
        builder.addInt(i);

        if (OBJECT3D_COMPONENTS.includes(componentName)) {
          builder.addFloat(Math.fround(dataToSync.x));
          builder.addFloat(Math.fround(dataToSync.y));
          builder.addFloat(Math.fround(dataToSync.z));
        } else {
          if (typeof dataToSync === 'object') {
            if (!aframeSchemaSortedKeys.has(componentName)) {
              aframeSchemaSortedKeys.set(componentName, [...Object.keys(AFRAME.components[componentName].schema)].sort());
            }

            const aframeSchemaKeys = aframeSchemaSortedKeys.get(componentName);

            for (let j = 0; j <= aframeSchemaKeys.length; j++) {
              const key = aframeSchemaKeys[j];

              if (dataToSync[key] !== undefined) {
                builder.addInt(j);

                const value = dataToSync[key];

                if (typeof value === "number") {
                  if (Number.isInteger(value)) {
                    if (value > 2147483647 || value < -2147483648) {
                      NAF.log.error('64 bit integers not supported', value, componentSchema);
                    } else {
                      builder.add(value);
                    }
                  } else {
                    builder.add(Math.fround(value));
                  }
                } else {
                  builder.add(value);
                }
              }
            }
          } else {
            const value = dataToSync;

            if (typeof value === "object") {
              NAF.log.error('Schema should not set property for object or array values', value, componentSchema);
            } else if (typeof value === "number") {
              if (Number.isInteger(value)) {
                if (value > 2147483647 || value < -2147483648) {
                  NAF.log.error('64 bit integers not supported', value, componentSchema);
                } else {
                  builder.add(value);
                }
              } else {
                builder.add(Math.fround(value));
              }
            } else {
              builder.add(value);
            }
          }
        }

        builder.end();
      }
    }

    if (hadComponents) {
      builder.end();
    }

    return hadComponents;
  },

  canSync: function() {
    // This client will send a sync if:
    //
    // - The client is the owner
    // - The client is the creator, and the owner is not in the room.
    //
    // The reason for the latter case is so the object will still be
    // properly instantiated if the owner leaves. (Since the object lifetime
    // is tied to the creator.)
    if (this.data.owner && this.isMine()) return true;
    if (!this.createdByMe()) return false;

    const clients = NAF.connection.getConnectedClients();

    for (let clientId in clients) {
      if (clientId === this.data.owner) return false;
    }

    return true;
  },

  getParentId: function() {
    this.initNetworkParent(); // TODO fix calling this each network tick
    if (!this.parent) {
      return null;
    }
    var netComp = this.parent.getAttribute('networked');
    return netComp.networkId;
  },

  /* Receiving updates */

  networkUpdate: function(entityDataRef, isFullSync) {
    const entityDataOwner = uuid.stringify(refGetUuidBytes(entityDataRef, 1, uuidByteBuf));
    const entityDataLastOwnerTime = refGetInt(entityDataRef, 2) + BASE_OWNER_TIME;

    // Avoid updating components if the entity data received did not come from the current owner.
    if (entityDataLastOwnerTime < this.lastOwnerTime ||
          (this.lastOwnerTime === entityDataLastOwnerTime && this.data.owner > entityDataOwner)) {
      return;
    }

    if (isFullSync && this.data.owner !== entityDataOwner) {
      var wasMine = this.isMine();
      this.lastOwnerTime = entityDataLastOwnerTime;

      const oldOwner = this.data.owner;
      const newOwner = entityDataOwner;

      this.el.setAttribute('networked', { owner: entityDataOwner });

      if (wasMine) {
        this.onOwnershipLostEvent.newOwner = newOwner;
        this.el.emit(this.OWNERSHIP_LOST, this.onOwnershipLostEvent);
      }
      this.onOwnershipChangedEvent.oldOwner = oldOwner;
      this.onOwnershipChangedEvent.newOwner = newOwner;
      this.el.emit(this.OWNERSHIP_CHANGED, this.onOwnershipChangedEvent);
    }
    if (isFullSync && this.data.persistent !== refGetBool(entityDataRef, 5)) {
      this.el.setAttribute('networked', { persistent: refGetBool(entityDataRef, 5) });
    }
    this.updateNetworkedComponents(entityDataRef, isFullSync);
  },

  updateNetworkedComponents: function(entityDataRef, isFullSync) {
    this.startLerpingFrame();

    const len = entityDataRef.length();

    for (let iData = isFullSync ? 7 : 3; iData < len; iData++) {
      const componentDataRef = tmpRef;
      refCp(entityDataRef, componentDataRef);
      refAdvanceToIndexGet(componentDataRef, iData);
      const componentIndex = refGetInt(componentDataRef, 0);
      const componentSchema = this.componentSchemas[componentIndex];
      const el = this.getCachedElement(componentIndex);

      if (el === null) continue;

      const componentName = componentSchema.component ? componentSchema.component : componentSchema;

      if (!OBJECT3D_COMPONENTS.includes(componentName)) {
        if (componentSchema.property) {
          el.setAttribute(componentName, componentSchema.property, refGetToObject(componentDataRef, 1));
        } else {
          if (!aframeSchemaSortedKeys.has(componentName)) {
            aframeSchemaSortedKeys.set(componentName, [...Object.keys(AFRAME.components[componentName].schema)].sort());
          }

          const componentDataLength = componentDataRef.length();

          if (componentDataLength > 1) {
            const attributeValue = {};
            const aframeSchemaKeys = aframeSchemaSortedKeys.get(componentName);

            for (let j = 1; j < componentDataLength; j += 2) {
              const key = refGetInt(componentDataRef, j);
              const value = refGetToObject(componentDataRef, j + 1);

              attributeValue[aframeSchemaKeys[key]] = value;
            }

            el.setAttribute(componentName, attributeValue);
          }
        }
      } else {
        const x = refGetNumeric(componentDataRef, 1);
        const y = refGetNumeric(componentDataRef, 2);
        const z = refGetNumeric(componentDataRef, 3);

        let lerper;

        for (let i = 0, l = this.lerpers.length; i < l; i++) {
          const info = this.lerpers[i];

          if (info.object3D === el.object3D) {
            lerper = info.lerper;
            break;
          }
        }

        if (!lerper) {
          lerper = new Lerper(NAF.options.updateRate, NAF.options.maxLerpDistance);
          this.lerpers.push({ lerper, object3D: el.object3D });
          lerper.startFrame();
        }

        switch(componentName) {
          case 'position':
            lerper.setPosition(x, y, z);
            break;
          case 'rotation':
            this.conversionEuler.set(DEG2RAD * x, DEG2RAD * y, DEG2RAD * z);
            tmpQuaternion.setFromEuler(this.conversionEuler)
            lerper.setQuaternion(tmpQuaternion.x, tmpQuaternion.y, tmpQuaternion.z, tmpQuaternion.w);
            break;
          case 'scale':
            lerper.setScale(x, y, z);
            break;
          default:
        NAF.log.error('Could not set value in interpolation buffer.', el, componentName, x, y, z);
            break;
        }

      }
    }
  },

  startLerpingFrame: function() {
    if (!this.lerpers) return;

    for (let i = 0; i < this.lerpers.length; i++) {
      this.lerpers[i].lerper.startFrame();
    }
  },

  removeLerp: function() {
    this.lerpers = [];
  },

  remove: function () {
    if (this.isMine() && NAF.connection.isConnected()) {
      if (NAF.entities.hasEntity(this.data.networkId)) {
        resetBuilder();
        builder.startVector();
        builder.add(false); // is update (no, is remove)
        builder.add(this.data.networkId);
        builder.end();

        NAF.connection.broadcastDataGuaranteed(arrayBufferToBase64(builder.finish()));
      } else {
        NAF.log.error("Removing networked entity that is not in entities array.");
      }
    }
    NAF.entities.forgetEntity(this.data.networkId);
    document.body.dispatchEvent(this.entityRemovedEvent(this.data.networkId));
    this.el.sceneEl.systems.networked.deregister(this);
  },

  entityCreatedEvent() {
    return new CustomEvent('entityCreated', {detail: {el: this.el}});
  },

  entityRemovedEvent(networkId) {
    return new CustomEvent('entityRemoved', {detail: {networkId: networkId}});
  }
});

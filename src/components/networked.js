/* global AFRAME, NAF, THREE */
const flexbuffers = require('flatbuffers/js/flexbuffers');
var deepEqual = require('../DeepEquals');
var DEG2RAD = THREE.Math.DEG2RAD;
var OBJECT3D_COMPONENTS = ['position', 'rotation', 'scale'];

const hashCode = function(s) {
  var h = 0, l = s.length, i = 0;
  if ( l > 0 )
    while (i < l)
      h = (h << 5) - h + s.charCodeAt(i++) | 0;
  return h;
};

const builder = new flexbuffers.builder();
const builderUintView = new Uint8Array(builder.buffer);
const tempKeyList = [];
const resetBuilder = () => {
  builderUintView.fill(0);
  builder.stack.length = 0;
  builder.stackPointers.length = 0;
  builder.offset = 0;
  builder.finished = false;
};
const arrayBufferToBase64 = ( buffer ) => {
    let binary = '';
    const bytes = new Uint8Array( buffer );
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
};

// Don't dedup because we want to re-use builder
builder.dedupStrings = false;
builder.dedupKeys = false;
builder.dedupKeyVectors = false;

const { Lerper, TYPE_POSITION, TYPE_QUATERNION, TYPE_SCALE } = require('../Lerper');

const tmpPosition = new THREE.Vector3();
const tmpQuaternion = new THREE.Quaternion();

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

      // "d" is an array of entity datas per entity in this.components.
      const data = { d: [] };

      for (let i = 0, l = this.components.length; i < l; i++) {
        const c = this.components[i];
        if (!c.isMine()) continue;
        if (!c.el.parentElement) {
          NAF.log.error("entity registered with system despite being removed");
          //TODO: Find out why tick is still being called
          return;
        }

        const syncData = this.components[i].syncDirty();
        if (!syncData) continue;

        data.d.push(syncData);
      }

      if (data.d.length > 0) {
        NAF.connection.broadcastData('um', data);
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

    this.syncAllData = {};
    this.syncDirtyData = {};
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
    return !!this.el.firstUpdateData;
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
    const persistentFirstSync = NAF.entities.getPersistentFirstSync(networkId);
    if (persistentFirstSync) {
      this.networkUpdate(persistentFirstSync);
      NAF.entities.forgetPersistentFirstSync(networkId);
    }
  },

  firstUpdate: function() {
    var entityData = this.el.firstUpdateData;
    this.networkUpdate(entityData);
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
    if (!this.isMine() && NAF.options.useLerp) {
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

    builder.add(true) // is all
    builder.add(!!isFirstSync) // is first sync
    builder.add(this.data.networkId);
    builder.add(this.data.owner);
    builder.add(hashCode(this.data.owner));
    builder.add(this.data.creator);
    builder.add(this.lastOwnerTime);
    builder.add(this.data.template);
    builder.add(this.data.persistent);
    builder.add(this.getParentId());

    var components = this.gatherComponentsData(true);

    builder.end();

    const syncData = this.createSyncAllData(components, isFirstSync);
    syncData.flexbufferBytes = arrayBufferToBase64(builder.finish());

    if (targetClientId) {
      NAF.connection.sendDataGuaranteed(targetClientId, 'u', syncData);
    } else {
      NAF.connection.broadcastDataGuaranteed('u', syncData);
    }
  },

  syncDirty: function() {
    if (!this.canSync()) {
      return;
    }

    resetBuilder();
    builder.startVector();
    builder.add(false) // is all
    builder.add(this.data.networkId);
    builder.add(hashCode(this.data.owner));
    builder.add(this.lastOwnerTime);

    var components = this.gatherComponentsData(false);

    builder.end();

    if (components === null) {
      return;
    }

    const syncData = this.createSyncDirtyData(components);
    syncData.flexbufferBytes = arrayBufferToBase64(builder.finish());

    return syncData;
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

  gatherComponentsData: function(fullSync) {
    var componentsData = null;

    for (var i = 0; i < this.componentSchemas.length; i++) {
      var componentSchema = this.componentSchemas[i];
      var componentElement = this.getCachedElement(i);

      if (!componentElement) {
        if (fullSync) {
          componentsData = componentsData || {};
          componentsData[i] = null;
        }
        continue;
      }

      var componentName = componentSchema.component ? componentSchema.component : componentSchema;
      var componentData = componentElement.getAttribute(componentName);

      if (componentData === null) {
        if (fullSync) {
          componentsData = componentsData || {};
          componentsData[i] = null;
        }
        continue;
      }

      var syncedComponentData = componentSchema.property ? componentData[componentSchema.property] : componentData;

      // Use networkUpdatePredicate to check if the component needs to be updated.
      // Call networkUpdatePredicate first so that it can update any cached values in the event of a fullSync.
      if (this.networkUpdatePredicates[i](syncedComponentData) || fullSync) {
        componentsData = componentsData || {};

        let dataToSync = syncedComponentData;

        if (this.positionNormalizer && componentName === "position") {
          dataToSync = this.positionNormalizer(dataToSync, this.el);
        }

        componentsData[i] = dataToSync;

        builder.addInt(i);

        if (OBJECT3D_COMPONENTS.includes(componentName)) {
          builder.addFloat(dataToSync.x);
          builder.addFloat(dataToSync.y);
          builder.addFloat(dataToSync.z);
        } else {
          if (typeof dataToSync === 'object') {
            tempKeyList.length = 0;

            for (const k of Object.keys(dataToSync)) {
              tempKeyList.push(k);
            }

            tempKeyList.sort();

            for (let i = 0; i < tempKeyList.length; i++) {
              builder.add(dataToSync[tempKeyList[i]]);
            }
          } else {
            builder.add(dataToSync);
          }
        }
      }
    }

    return componentsData;
  },

  createSyncAllData: function(components, isFirstSync) {
    var { syncAllData, data } = this;
    syncAllData.isAll = true;
    syncAllData.networkId = data.networkId;
    syncAllData.owner = data.owner;
    syncAllData.ownerHash = hashCode(data.owner);
    syncAllData.creator = data.creator;
    syncAllData.lastOwnerTime = this.lastOwnerTime;
    syncAllData.template = data.template;
    syncAllData.persistent = data.persistent;
    syncAllData.parent = this.getParentId();
    syncAllData.components = components;
    syncAllData.isFirstSync = !!isFirstSync;
    return syncAllData;
  },

  createSyncDirtyData: function(components) {
    var { syncDirtyData, data } = this;
    syncDirtyData.isAll = false;
    syncDirtyData.networkId = data.networkId;
    syncDirtyData.lastOwnerTime = this.lastOwnerTime;
    syncDirtyData.ownerHash = hashCode(data.owner);
    syncDirtyData.components = components;
    return syncDirtyData;
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

  networkUpdate: function(entityData) {
    // Avoid updating components if the entity data received did not come from the current owner.
    if (entityData.lastOwnerTime < this.lastOwnerTime ||
          (this.lastOwnerTime === entityData.lastOwnerTime && this.data.ownerHash > entityData.ownerHash)) {
      return;
    }

    if (entityData.isAll && this.data.owner !== entityData.owner) {
      var wasMine = this.isMine();
      this.lastOwnerTime = entityData.lastOwnerTime;

      const oldOwner = this.data.owner;
      const newOwner = entityData.owner;

      this.el.setAttribute('networked', { owner: entityData.owner });

      if (wasMine) {
        this.onOwnershipLostEvent.newOwner = newOwner;
        this.el.emit(this.OWNERSHIP_LOST, this.onOwnershipLostEvent);
      }
      this.onOwnershipChangedEvent.oldOwner = oldOwner;
      this.onOwnershipChangedEvent.newOwner = newOwner;
      this.el.emit(this.OWNERSHIP_CHANGED, this.onOwnershipChangedEvent);
    }
    if (entityData.isAll && this.data.persistent !== entityData.persistent) {
      this.el.setAttribute('networked', { persistent: entityData.persistent });
    }
    this.updateNetworkedComponents(entityData.components);
  },

  updateNetworkedComponents: function(components) {
    this.startLerpingFrame();

    for (var componentIndex = 0, l = this.componentSchemas.length; componentIndex < l; componentIndex++) {
      var componentData = components[componentIndex];
      var componentSchema = this.componentSchemas[componentIndex];
      var componentElement = this.getCachedElement(componentIndex);

      if (componentElement === null || componentData === null || componentData === undefined ) {
        continue;
      }

      if (componentSchema.component) {
        if (componentSchema.property) {
          this.updateNetworkedComponent(componentElement, componentSchema.component, componentSchema.property, componentData);
        } else {
          this.updateNetworkedComponent(componentElement, componentSchema.component, componentData);
        }
      } else {
        this.updateNetworkedComponent(componentElement, componentSchema, componentData);
      }
    }
  },

  updateNetworkedComponent: function (el, componentName, data, value) {
    const affectsTransform = OBJECT3D_COMPONENTS.includes(componentName);

    if(!NAF.options.useLerp || !affectsTransform) {
      if (value === undefined) {
        el.setAttribute(componentName, data);
      } else {
        el.setAttribute(componentName, data, value);
      }

      if (affectsTransform) {
        el.object3D.matrixNeedsUpdate = true;
      }

      return;
    }

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
        lerper.setPosition(data.x, data.y, data.z);
        return;
      case 'rotation':
        this.conversionEuler.set(DEG2RAD * data.x, DEG2RAD * data.y, DEG2RAD * data.z);
        tmpQuaternion.setFromEuler(this.conversionEuler)
        lerper.setQuaternion(tmpQuaternion.x, tmpQuaternion.y, tmpQuaternion.z, tmpQuaternion.w);
        return;
      case 'scale':
        lerper.setScale(data.x, data.y, data.z);
        return;
    }

    NAF.log.error('Could not set value in interpolation buffer.', el, componentName, data);
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
      var syncData = { networkId: this.data.networkId };
      if (NAF.entities.hasEntity(this.data.networkId)) {
        NAF.connection.broadcastDataGuaranteed('r', syncData);
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

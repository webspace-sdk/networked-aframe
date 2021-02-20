/* global AFRAME, NAF, THREE */
var deepEqual = require('../DeepEquals');
var DEG2RAD = THREE.Math.DEG2RAD;
var OBJECT3D_COMPONENTS = ['position', 'rotation', 'scale'];

const LERP_FRAMES = 30;
const TYPE_POSITION = 0x1;
const TYPE_QUATERNION = 0x2;
const TYPE_SCALE = 0x4;
const tmpPosition = new THREE.Vector3();

class Lerper {
  constructor(fps = 10) {
    this.frames = [];
    this.frameIndex = -1;
    this.tmpQuaternion = new THREE.Quaternion();
    this.running = false;

    for (let i = 0; i < LERP_FRAMES; i++) {
      // Frames are:
      // time
      // type flags
      // pos x y z
      // quat x y z w
      // scale x y z
      this.frames.push([0, 0, 0.0, 0.0, 0.0, 0.0, 0.0 ,0.0, 0.0, 1.0, 1.0, 1.0]);
    }

    this.bufferTimeMs = (1000 / fps) * 3;
  }

  reset() {
    this.frameIndex = -1;

    for (let i = 0; i < this.frames.length; i++) {
      this.frames[i][0] = 0;
    }
  }

  lerp(start, end, t) {
    return start + (end - start) * t;
  }

  startFrame() {
    this.running = true;
    this.frameIndex = (this.frameIndex + 1) % this.frames.length;

    const frame = this.frames[this.frameIndex];
    frame[0] = performance.now();
    frame[1] = 0; // Flags
    frame[2] = 0.0;
    frame[3] = 0.0;
    frame[4] = 0.0;
    frame[5] = 0.0;
    frame[6] = 0.0;
    frame[7] = 0.0;
    frame[8] = 0.0;
    frame[9] = 1.0;
    frame[10] = 1.0;
    frame[11] = 1.0;
  }

  setPosition(x, y, z) {
    const frame = this.frames[this.frameIndex];
    frame[1] |= TYPE_POSITION;
    frame[2] = x;
    frame[3] = y;
    frame[4] = z;
  }

  setQuaternion(x, y, z, w) {
    const frame = this.frames[this.frameIndex];
    frame[1] |= TYPE_QUATERNION;
    frame[5] = x;
    frame[6] = y;
    frame[7] = z;
    frame[8] = w;
  }

  setScale(x, y, z) {
    const frame = this.frames[this.frameIndex];
    frame[1] |= TYPE_SCALE;
    frame[9] = x;
    frame[10] = y;
    frame[11] = z;
  }

  step(type, target) {
    if (!this.running) return;

    const { frames } = this;
    if (this.frameIndex === -1) return;

    const serverTime = performance.now() - this.bufferTimeMs;
    let olderFrame;
    let newerFrame;

    for (let i = frames.length; i >= 1; i--) {
      const idx = (this.frameIndex + i) % this.frames.length;
      const frame = frames[idx];

      if (frame[0] !== 0 && frame[0] <= serverTime && frame[1] & type) {
        olderFrame = frame;

        for (let j = 1; j < frames.length; j++) {
          const nidx = (idx + j) % this.frames.length;
          // Find the next frame that has this type (pos, rot, scale)
          if (frames[nidx][1] & type && frames[nidx][0] !== 0 && frames[nidx][0] > olderFrame[0]) {
            newerFrame = frames[nidx];
            break;
          }
        }

        break;
      }
    }

    if (!olderFrame && !newerFrame) return;

    // TODO need to deal with initial frame properly.
    // A is newer, B is older
    if (olderFrame && !newerFrame) {
      // First frame.
      if (type === TYPE_POSITION) {
        target.x = olderFrame[2];
        target.y = olderFrame[3];
        target.z = olderFrame[4];
      } else if (type === TYPE_QUATERNION) {
        target.x = olderFrame[5];
        target.y = olderFrame[6];
        target.z = olderFrame[7];
        target.w = olderFrame[8];
      } else if (type === TYPE_SCALE) {
        target.x = olderFrame[9];
        target.y = olderFrame[10];
        target.z = olderFrame[11];
      }

      return;
    }

    const t0 = newerFrame[0];
    const t1 = olderFrame[0];

    // THE TIMELINE
    // t = time (serverTime)
    // p = entity position
    // ------ t1 ------ tn --- t0 ----->> NOW
    // ------ p1 ------ pn --- p0 ----->> NOW
    // ------ 0% ------ x% --- 100% --->> NOW
    const zeroPercent = serverTime - t1;
    const hundredPercent = t0 - t1;
    const pPercent = zeroPercent / hundredPercent;

    if (type === TYPE_POSITION) {
      target.x = this.lerp(olderFrame[2], newerFrame[2], pPercent);
      target.y = this.lerp(olderFrame[3], newerFrame[3], pPercent);
      target.z = this.lerp(olderFrame[4], newerFrame[4], pPercent);
    } else if (type === TYPE_QUATERNION) {
      target.x = olderFrame[5];
      target.y = olderFrame[6];
      target.z = olderFrame[7];
      target.w = olderFrame[8];
      this.tmpQuaternion.x = newerFrame[5];
      this.tmpQuaternion.y = newerFrame[6];
      this.tmpQuaternion.z = newerFrame[7];
      this.tmpQuaternion.w = newerFrame[8];
      target.slerp(this.tmpQuaternion, pPercent);
    } else if (type === TYPE_SCALE) {
      target.x = this.lerp(olderFrame[9], newerFrame[9], pPercent);
      target.y = this.lerp(olderFrame[10], newerFrame[10], pPercent);
      target.z = this.lerp(olderFrame[11], newerFrame[11], pPercent);
    }

    if (olderFrame && olderFrame[0] !== 0 && serverTime - olderFrame[0] > 5000.0) {
      // Optimization, stop doing work after older frame is more than 5 seconds old.
      this.running = false;
    }

    return true;
  }
}
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
    this.bufferInfos = [];
    this.bufferPosition = new THREE.Vector3();
    this.bufferQuaternion = new THREE.Quaternion();
    this.bufferScale = new THREE.Vector3();

    var wasCreatedByNetwork = this.wasCreatedByNetwork();

    this.onConnected = this.onConnected.bind(this);

    this.syncData = {};
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
      for (var i = 0; i < this.bufferInfos.length; i++) {
        var bufferInfo = this.bufferInfos[i];
        var lerper = bufferInfo.buffer;
        var object3D = bufferInfo.object3D;

        let pos = tmpPosition;
        const positionUpdated = lerper.step(TYPE_POSITION, pos);

        if (positionUpdated) {
          if (this.positionDenormalizer) {
            pos = this.positionDenormalizer(pos, object3D.position);
          }

          object3D.position.copy(pos);
        }

        object3D.matrixNeedsUpdate = positionUpdated ||
          lerper.step(TYPE_QUATERNION, object3D.quaternion) ||
          lerper.step(TYPE_SCALE, object3D.scale);
      }
    }
  },

  /* Sending updates */

  syncAll: function(targetClientId, isFirstSync) {
    if (!this.canSync()) {
      return;
    }

    var components = this.gatherComponentsData(true);

    var syncData = this.createSyncData(components, isFirstSync);

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

    var components = this.gatherComponentsData(false);

    if (components === null) {
      return;
    }

    return this.createSyncData(components);
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
      }
    }

    return componentsData;
  },

  createSyncData: function(components, isFirstSync) {
    var { syncData, data } = this;
    syncData.networkId = data.networkId;
    syncData.owner = data.owner;
    syncData.creator = data.creator;
    syncData.lastOwnerTime = this.lastOwnerTime;
    syncData.template = data.template;
    syncData.persistent = data.persistent;
    syncData.parent = this.getParentId();
    syncData.components = components;
    syncData.isFirstSync = !!isFirstSync;
    return syncData;
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
          (this.lastOwnerTime === entityData.lastOwnerTime && this.data.owner > entityData.owner)) {
      return;
    }

    if (this.data.owner !== entityData.owner) {
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
    if (this.data.persistent !== entityData.persistent) {
      this.el.setAttribute('networked', { persistent: entityData.persistent });
    }
    this.updateNetworkedComponents(entityData.components);
  },

  updateNetworkedComponents: function(components) {
    for (let i = 0; i < this.bufferInfos.length; i++) {
      const lerper = this.bufferInfos[i].buffer;

      if (lerper) {
        lerper.startFrame();
      }
    }

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
    if(!NAF.options.useLerp || !OBJECT3D_COMPONENTS.includes(componentName)) {
      if (value === undefined) {
        el.setAttribute(componentName, data);
      } else {
        el.setAttribute(componentName, data, value);
      }

      el.object3D.matrixNeedsUpdate = true;

      return;
    }

    let bufferInfo;

    for (let i = 0, l = this.bufferInfos.length; i < l; i++) {
      const info = this.bufferInfos[i];

      if (info.object3D === el.object3D) {
        bufferInfo = info;
        break;
      }
    }

    if (!bufferInfo) {
      bufferInfo = { buffer: new Lerper(10), object3D: el.object3D };
      this.bufferInfos.push(bufferInfo);
      bufferInfo.buffer.startFrame();
    }

    var lerper = bufferInfo.buffer;

    switch(componentName) {
      case 'position':
        lerper.setPosition(data.x, data.y, data.z);
        return;
      case 'rotation':
        this.conversionEuler.set(DEG2RAD * data.x, DEG2RAD * data.y, DEG2RAD * data.z);
        this.bufferQuaternion.setFromEuler(this.conversionEuler)
        lerper.setQuaternion(this.bufferQuaternion.x, this.bufferQuaternion.y, this.bufferQuaternion.z, this.bufferQuaternion.w);
        return;
      case 'scale':
        lerper.setScale(data.x, data.y, data.z);
        return;
    }
    NAF.log.error('Could not set value in interpolation buffer.', el, componentName, data, bufferInfo);
  },

  removeLerp: function() {
    this.bufferInfos = [];
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

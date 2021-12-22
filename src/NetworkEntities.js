/* global NAF */
var ChildEntityCache = require('./ChildEntityCache');
const uuid = require("uuid")
const FBFullUpdateData = require('./schema/networked-aframe/full-update-data').FullUpdateData;
const FBUpdateOp = require('./schema/networked-aframe/update-op').UpdateOp;

const fullUpdateDataRef = new FBFullUpdateData();
const uuidByteBuf = [];
uuidByteBuf.length = 16;

class NetworkEntities {

  constructor() {
    this.entities = {};
    this.childCache = new ChildEntityCache();
    this.onRemoteEntityCreatedEvent = new Event('remoteEntityCreated');
    this._persistentFirstSyncs = {};
    this.positionNormalizer = null;
    this.positionDenormalizer = null;
    this.lastCompleteSyncAt = 0;
    this.needsCompleteSync = false;
  }

  registerEntity(networkId, entity) {
    this.entities[networkId] = entity;
  }

  createRemoteEntity(updateRef) {
    const networkId = updateRef.networkId();
    const fullUpdateData = updateRef.fullUpdateData(fullUpdateDataRef);
    const template = fullUpdateData.template();

    NAF.log.write('Creating remote entity', networkId, template);

    const el = NAF.schemas.getCachedTemplate(template);

    this.addNetworkComponent(el, updateRef);

    return el;
  }

  addNetworkComponent(entity, updateRef) {
    const networkId = updateRef.networkId();
    const fullUpdateData = updateRef.fullUpdateData(fullUpdateDataRef);

    for (let i = 0; i < 16; i++) {
      uuidByteBuf[i] = updateRef.owner(i);
    }

    const owner = uuid.stringify(uuidByteBuf);

    for (let i = 0; i < 16; i++) {
      uuidByteBuf[i] = fullUpdateData.creator(i);
    }

    const creator = uuid.stringify(uuidByteBuf);
    const template = fullUpdateData.template();
    const persistent = fullUpdateData.persistent();

    // Clone update ref, since reference will be re-used
    entity.firstUpdateRef = new FBUpdateOp();
    entity.firstUpdateRef.bb = updateRef.bb;
    entity.firstUpdateRef.bb_pos = updateRef.bb_pos;

    entity.setAttribute('networked', { template, owner, creator, networkId, persistent });
  }

  updateEntity(updateRef, source, sender) {
    if (NAF.options.syncSource && source !== NAF.options.syncSource) return;

    const isFullSync = updateRef.fullUpdateData(fullUpdateDataRef) != null;
    const networkId = updateRef.networkId();

    for (let i = 0; i < 16; i++) {
      uuidByteBuf[i] = updateRef.owner(i);
    }

    const owner = uuid.stringify(uuidByteBuf);

    if (this.hasEntity(networkId)) {
      const entity = this.entities[networkId];
      entity.components.networked.networkUpdate(updateRef, sender);
    } else if (isFullSync && NAF.connection.activeDataChannels[owner] !== false) {
      if (NAF.options.firstSyncSource && source !== NAF.options.firstSyncSource) {
        NAF.log.write('Ignoring first sync from disallowed source', source);
        return;
      }

      if (NAF.connection.adapter.authorizeCreateEntity(fullUpdateDataRef.template(), sender)) {
        this.receiveFirstUpdateFromEntity(updateRef, fullUpdateDataRef);
      }
    }
  }

  receiveFirstUpdateFromEntity(updateRef, fullUpdateDataRef) {
    var networkId = updateRef.networkId();
    var parent = fullUpdateDataRef.parentId();

    var parentNotCreatedYet = parent && !this.hasEntity(parent);
    if (parentNotCreatedYet) {
      this.childCache.addChild(parent, updateRef);
    } else {
      var remoteEntity = this.createRemoteEntity(updateRef);
      this.createAndAppendChildren(networkId, remoteEntity);
      this.addEntityToPage(remoteEntity, parent);
    }
  }

  createAndAppendChildren(parentId, parentEntity) {
    var children = this.childCache.getChildren(parentId);
    for (var i = 0; i < children.length; i++) {
      const childEntityUpdateRef = children[i];
      const childId = childEntityUpdateRef.networkId();
      if (this.hasEntity(childId)) {
        NAF.log.warn(
          'Tried to instantiate entity multiple times',
          childId,
          'Existing entity:',
          this.getEntity(childId)
        );
        continue;
      }
      const childEntity = this.createRemoteEntity(childEntityUpdateRef);
      this.createAndAppendChildren(childId, childEntity);
      parentEntity.appendChild(childEntity);
    }
  }

  addEntityToPage(entity, parentId) {
    if (this.hasEntity(parentId)) {
      this.addEntityToParent(entity, parentId);
    } else {
      this.addEntityToSceneRoot(entity);
    }
  }

  addEntityToParent(entity, parentId) {
    this.entities[parentId].appendChild(entity);
  }

  addEntityToSceneRoot(el) {
    var scene = document.querySelector('a-scene');
    scene.appendChild(el);
  }

  completeSync(force = false) {
    for (var id in this.entities) {
      if (this.entities.hasOwnProperty(id)) {
        const networked = this.entities[id].components.networked;

        if (force) {
          networked.sendFullSync();
        } else {
          networked.sendInitialSync();
        }
      }
    }

    this.needsCompleteSync = false;
    this.lastCompleteSyncAt = performance.now();
  }

  removeRemoteEntity(deleteRef, source, sender) {
    if (NAF.options.syncSource && source !== NAF.options.syncSource) return;

    const networkId = deleteRef.networkId();
    const entity = this.entities[networkId];

    if (!entity) return;

    if (!NAF.connection.adapter.authorizeEntityManipulation(entity, sender)) return;
    return this.removeEntity(networkId);
  }

  removeEntitiesOfClient(clientId) {
    var entityList = [];
    for (var id in this.entities) {
      var entityCreator = NAF.utils.getCreator(this.entities[id]);
      if (entityCreator === clientId) {
        let persists;
        const component = this.entities[id].getAttribute('networked');
        if (component && component.persistent) {
          persists = NAF.utils.isMine(this.entities[id]) || NAF.utils.takeOwnership(this.entities[id]);
        }
        if (!persists) {
          var entity = this.removeEntity(id);
          entityList.push(entity);
        }
      }
    }
    return entityList;
  }

  removeEntity(id) {
    if (!this.hasEntity(id)) {
      NAF.log.error("Tried to remove entity I don't have.");
      return null;
    }

    const entity = this.entities[id];

    // Remove elements from the bottom up, so A-frame detached them appropriately
    const walk = (n) => {
      const children = n.children;

      for (let i = 0; i < children.length; i++) {
        walk(children[i]);
      }

      if (n.parentNode) {
        n.parentNode.removeChild(n);
      }
    };

    walk(entity);

    return entity;
  }

  forgetEntity(id){
    delete this.entities[id];
  }

  getEntity(id) {
    if (!this.hasEntity(id)) return null;
    return this.entities[id];
  }

  // Returns true if an entity with the given network id has been registered,
  // which means it is valid and its networked component has been initialized.
  hasEntity(id) {
    return this.entities.hasOwnProperty(id);
  }

  removeRemoteEntities(includeOwned = false, excludeEntities = []) {
    this.childCache = new ChildEntityCache();

    for (var id in this.entities) {
      const entity = this.entities[id];
      if (excludeEntities.includes(entity)) continue;

      var owner = entity.getAttribute('networked').owner;

      if (includeOwned || owner != NAF.clientId) {
        this.removeEntity(id);
      }
    }
  }

  setPositionNormalizer(normalizer) {
    this.positionNormalizer = normalizer;
  }

  setPositionDenormalizer(denormalizer) {
    this.positionDenormalizer = denormalizer;
  }
}

module.exports = NetworkEntities;

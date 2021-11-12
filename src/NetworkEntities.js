/* global NAF */
var ChildEntityCache = require('./ChildEntityCache');
const uuid = require("uuid")

class NetworkEntities {

  constructor() {
    this.entities = {};
    this.childCache = new ChildEntityCache();
    this.onRemoteEntityCreatedEvent = new Event('remoteEntityCreated');
    this._persistentFirstSyncs = {};
    this.positionNormalizer = null;
    this.positionDenormalizer = null;
  }

  registerEntity(networkId, entity) {
    this.entities[networkId] = entity;
  }

  createRemoteEntity(entityData) {
    NAF.log.write('Creating remote entity', entityData);

    const networkId = entityData[0];
    const template = entityData[4];

    const el = NAF.schemas.getCachedTemplate(template);

    this.addNetworkComponent(el, entityData);

    this.registerEntity(networkId, el);

    return el;
  }

  addNetworkComponent(entity, entityData) {
    const networkId = entityData[0];
    const owner = uuid.stringify(entityData[1]);
    const creator = uuid.stringify(entityData[3]);
    const template = entityData[4];
    const persistent = entityData[5];

    entity.setAttribute('networked', { template, owner, creator, networkId, persistent });

    entity.firstUpdateData = entityData;
  }

  updateEntity(client, dataType, msg, source) {
    if (NAF.options.syncSource && source !== NAF.options.syncSource) return;

    const isFullSync = msg[1];
    for (let i = 2; i < msg.length; i++) {
      const entityData = msg[i];

      const networkId = entityData[0];
      const owner = uuid.stringify(entityData[1]);

      if (this.hasEntity(networkId)) {
        this.entities[networkId].components.networked.networkUpdate(entityData, isFullSync);
      } else if (isFullSync && NAF.connection.activeDataChannels[owner] !== false) {
        if (NAF.options.firstSyncSource && source !== NAF.options.firstSyncSource) {
          NAF.log.write('Ignoring first sync from disallowed source', source);
        } else {
          if (entityData[5] /* persistent */) {
            // If we receive a firstSync for a persistent entity that we don't have yet,
            // we assume the scene will create it at some point, so stash the update for later use.
            this._persistentFirstSyncs[networkId] = entityData;
          } else {
            this.receiveFirstUpdateFromEntity(entityData);
          }
        }
      }
    }
  }

  receiveFirstUpdateFromEntity(entityData) {
    var networkId = entityData[0];
    var parent = entityData[6];

    var parentNotCreatedYet = parent && !this.hasEntity(parent);
    if (parentNotCreatedYet) {
      this.childCache.addChild(parent, entityData);
    } else {
      var remoteEntity = this.createRemoteEntity(entityData);
      this.createAndAppendChildren(networkId, remoteEntity);
      this.addEntityToPage(remoteEntity, parent);
    }
  }

  createAndAppendChildren(parentId, parentEntity) {
    var children = this.childCache.getChildren(parentId);
    for (var i = 0; i < children.length; i++) {
      var childEntityData = children[i];
      var childId = childEntityData.networkId;
      if (this.hasEntity(childId)) {
        NAF.log.warn(
          'Tried to instantiate entity multiple times',
          childId,
          childEntityData,
          'Existing entity:',
          this.getEntity(childId)
        );
        continue;
      }
      var childEntity = this.createRemoteEntity(childEntityData);
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

  completeSync(targetClientId, isFirstSync) {
    for (var id in this.entities) {
      if (this.entities.hasOwnProperty(id)) {
        this.entities[id].components.networked.syncAll(targetClientId, isFirstSync);
      }
    }
  }

  removeRemoteEntity(client, dataType, msg, source) {
    if (NAF.options.syncSource && source !== NAF.options.syncSource) return;
    const networkId = msg[1];
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
    this.forgetPersistentFirstSync(id);

    if (this.hasEntity(id)) {
      var entity = this.entities[id];

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
    } else {
      NAF.log.error("Tried to remove entity I don't have.");
      return null;
    }
  }

  forgetEntity(id){
    delete this.entities[id];
    this.forgetPersistentFirstSync(id);
  }

  getPersistentFirstSync(id){
    return this._persistentFirstSyncs[id];
  }

  forgetPersistentFirstSync(id){
    delete this._persistentFirstSyncs[id];
  }

  getEntity(id) {
    if (this.entities.hasOwnProperty(id)) {
      return this.entities[id];
    }
    return null;
  }

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

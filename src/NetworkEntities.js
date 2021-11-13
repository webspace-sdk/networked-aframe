/* global NAF */
var ChildEntityCache = require('./ChildEntityCache');
const uuid = require("uuid")
const flexbuffers = require('flatbuffers/js/flexbuffers');
const { refCp, refAdvanceToIndexGet, refGetString, refGetBool, refGetUuidBytes } = require('./FlexBufferUtils');

const tmpRef = new flexbuffers.toReference(new ArrayBuffer(4));
const uuidByteBuf = [];

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

  createRemoteEntity(entityDataRef) {
    const networkId = refGetString(entityDataRef, 0);
    const template = refGetString(entityDataRef, 4);

    NAF.log.write('Creating remote entity', networkId, template);

    const el = NAF.schemas.getCachedTemplate(template);

    this.addNetworkComponent(el, entityDataRef);

    this.registerEntity(networkId, el);

    return el;
  }

  addNetworkComponent(entity, entityDataRef) {
    const networkId = refGetString(entityDataRef, 0);
    const owner = uuid.stringify(refGetUuidBytes(entityDataRef, 1, uuidByteBuf));
    const creator = uuid.stringify(refGetUuidBytes(entityDataRef, 3, uuidByteBuf));
    const template = refGetString(entityDataRef, 4);
    const persistent = refGetBool(entityDataRef, 5);

    entity.setAttribute('networked', { template, owner, creator, networkId, persistent });

    entity.firstUpdateDataRef = entityDataRef;
  }

  updateEntity(client, dataType, msgRef, source) {
    if (NAF.options.syncSource && source !== NAF.options.syncSource) return;

    const msgLen = msgRef.length();
    const isFullSync = refGetBool(msgRef, 1);

    for (let i = 2; i < msgLen; i++) {
      const entityDataRef = tmpRef; // Re-used cache, be careful
      refCp(msgRef, entityDataRef);
      refAdvanceToIndexGet(entityDataRef, i);

      const networkId = refGetString(entityDataRef, 0);
      const owner = uuid.stringify(refGetUuidBytes(entityDataRef, 1, uuidByteBuf));

      if (this.hasEntity(networkId)) {
        this.entities[networkId].components.networked.networkUpdate(entityDataRef, isFullSync);
      } else if (isFullSync && NAF.connection.activeDataChannels[owner] !== false) {
        if (NAF.options.firstSyncSource && source !== NAF.options.firstSyncSource) {
          NAF.log.write('Ignoring first sync from disallowed source', source);
        } else {
          if (refGetBool(entityDataRef, 5) /* persistent */) {
            // If we receive a firstSync for a persistent entity that we don't have yet,
            // we assume the scene will create it at some point, so stash the update for later use.
            // Make a copy since above we were using tempRef
            const entityDataRefCopy = new flexbuffers.toReference(msgRef.dataView.buffer);
            refCp(entityDataRef, entityDataRefCopy);
            this._persistentFirstSyncs[networkId] = entityDataRefCopy;
          } else {
            this.receiveFirstUpdateFromEntity(entityDataRef);
          }
        }
      }
    }
  }

  receiveFirstUpdateFromEntity(entityDataRef) {
    var networkId = refGetString(entityDataRef, 0);
    var parent = refGetString(entityDataRef, 6);

    var parentNotCreatedYet = parent && !this.hasEntity(parent);
    if (parentNotCreatedYet) {
      this.childCache.addChild(parent, entityDataRef);
    } else {
      var remoteEntity = this.createRemoteEntity(entityDataRef);
      this.createAndAppendChildren(networkId, remoteEntity);
      this.addEntityToPage(remoteEntity, parent);
    }
  }

  createAndAppendChildren(parentId, parentEntity) {
    var children = this.childCache.getChildren(parentId);
    for (var i = 0; i < children.length; i++) {
      var childEntityDataRef = children[i];
      var childId = refGetString(childEntityDataRef, 0);
      if (this.hasEntity(childId)) {
        NAF.log.warn(
          'Tried to instantiate entity multiple times',
          childId,
          'Existing entity:',
          this.getEntity(childId)
        );
        continue;
      }
      var childEntity = this.createRemoteEntity(childEntityDataRef);
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

  removeRemoteEntity(client, dataType, msgRef, source) {
    if (NAF.options.syncSource && source !== NAF.options.syncSource) return;
    const networkId = refGetString(msgRef, 0);
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

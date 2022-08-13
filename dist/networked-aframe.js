/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	// Global vars and functions
	__webpack_require__(1);

	// Network components
	__webpack_require__(32);
	__webpack_require__(33);
	__webpack_require__(47);

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var options = __webpack_require__(2);
	var utils = __webpack_require__(3);
	var NafLogger = __webpack_require__(4);
	var Schemas = __webpack_require__(5);
	var NetworkEntities = __webpack_require__(6);
	var NetworkConnection = __webpack_require__(17);
	var AdapterFactory = __webpack_require__(30);

	var naf = {};
	naf.app = '';
	naf.room = '';
	naf.clientId = '';
	naf.options = options;
	naf.utils = utils;
	naf.log = new NafLogger();
	naf.schemas = new Schemas();
	naf.version = '0.6.1';

	naf.adapters = new AdapterFactory();
	var entities = new NetworkEntities();
	var connection = new NetworkConnection(entities);
	naf.connection = connection;
	naf.entities = entities;

	module.exports = window.NAF = naf;

/***/ }),
/* 2 */
/***/ (function(module, exports) {

	"use strict";

	var options = {
	  debug: false,
	  updateRate: 15, // How often network components call `sync`
	  useLerp: true, // lerp position, rotation, and scale components on networked entities.
	  maxLerpDistance: null, // max distance to perform lerping
	  firstSyncSource: null, // If specified, only allow first syncs from this source.
	  syncSource: null // If specified, only allow syncs from this source.
	};
	module.exports = options;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

	'use strict';

	/* global NAF */

	module.exports.whenEntityLoaded = function (entity, callback) {
	  if (entity.hasLoaded) {
	    callback();
	  }
	  entity.addEventListener('loaded', function () {
	    callback();
	  });
	};

	module.exports.createHtmlNodeFromString = function (str) {
	  var div = document.createElement('div');
	  div.innerHTML = str;
	  var child = div.firstChild;
	  return child;
	};

	module.exports.getCreator = function (el) {
	  var components = el.components;
	  if (components.hasOwnProperty('networked')) {
	    return components['networked'].data.creator;
	  }
	  return null;
	};

	module.exports.getNetworkOwner = function (el) {
	  var components = el.components;
	  if (components.hasOwnProperty('networked')) {
	    return components['networked'].data.owner;
	  }
	  return null;
	};

	module.exports.getNetworkId = function (el) {
	  var components = el.components;
	  if (components.hasOwnProperty('networked')) {
	    return components['networked'].data.networkId;
	  }
	  return null;
	};

	module.exports.now = function () {
	  return Date.now();
	};

	module.exports.createNetworkId = function () {
	  return Math.random().toString(36).substring(2, 9);
	};

	/**
	 * Find the closest ancestor (including the passed in entity) that has a `networked` component
	 * @param {ANode} entity - Entity to begin the search on
	 * @returns {Promise<ANode>} An promise that resolves to an entity with a `networked` component
	 */
	function getNetworkedEntity(entity) {
	  return new Promise(function (resolve, reject) {
	    var curEntity = entity;

	    while (curEntity && curEntity.components && !curEntity.components.networked) {
	      curEntity = curEntity.parentNode;
	    }

	    if (!curEntity || !curEntity.components || !curEntity.components.networked) {
	      return reject(new Error('Entity does not have and is not a child of an entity with the [networked] component '));
	    }

	    if (curEntity.hasLoaded) {
	      resolve(curEntity);
	    } else {
	      curEntity.addEventListener('instantiated', function () {
	        resolve(curEntity);
	      }, { once: true });
	    }
	  });
	}

	module.exports.getNetworkedEntity = getNetworkedEntity;

	module.exports.takeOwnership = function (entity) {
	  var curEntity = entity;

	  while (curEntity && curEntity.components && !curEntity.components.networked) {
	    curEntity = curEntity.parentNode;
	  }

	  if (!curEntity || !curEntity.components || !curEntity.components.networked) {
	    throw new Error('Entity does not have and is not a child of an entity with the [networked] component ');
	  }

	  return curEntity.components.networked.takeOwnership();
	};

	module.exports.isMine = function (entity) {
	  var curEntity = entity;

	  while (curEntity && curEntity.components && !curEntity.components.networked) {
	    curEntity = curEntity.parentNode;
	  }

	  if (!curEntity || !curEntity.components || !curEntity.components.networked) {
	    throw new Error('Entity does not have and is not a child of an entity with the [networked] component ');
	  }

	  return curEntity.components.networked.data.owner === NAF.clientId;
	};

	module.exports.almostEqualVec3 = function (u, v, epsilon) {
	  return Math.abs(u.x - v.x) < epsilon && Math.abs(u.y - v.y) < epsilon && Math.abs(u.z - v.z) < epsilon;
	};

	// Convert a hex string to a byte array
	module.exports.hexToBytes = function (hex) {
	  var bytes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

	  bytes.length = hex.length / 2;

	  for (var c = 0, i = 0; c < hex.length; c += 2, i += 1) {
	    bytes[i] = parseInt(hex.substr(c, 2), 16);
	  }

	  return bytes;
	};

	var hexBuf = [];

	// Convert a byte array to a hex string
	module.exports.bytesToHex = function (bytes) {
	  hexBuf.length = 0;

	  for (var i = 0; i < bytes.length; i++) {
	    var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
	    hexBuf.push((current >>> 4).toString(16));
	    hexBuf.push((current & 0xF).toString(16));
	  }

	  return hexBuf.join('');
	};

/***/ }),
/* 4 */
/***/ (function(module, exports) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/*eslint no-console: "off" */

	var NafLogger = function () {
	  function NafLogger() {
	    _classCallCheck(this, NafLogger);

	    this.debug = false;
	  }

	  _createClass(NafLogger, [{
	    key: "setDebug",
	    value: function setDebug(debug) {
	      this.debug = debug;
	    }
	  }, {
	    key: "write",
	    value: function write() {
	      if (this.debug) {
	        console.log.apply(this, arguments);
	      }
	    }
	  }, {
	    key: "warn",
	    value: function warn() {
	      console.warn.apply(this, arguments);
	    }
	  }, {
	    key: "error",
	    value: function error() {
	      console.error.apply(this, arguments);
	    }
	  }]);

	  return NafLogger;
	}();

	module.exports = NafLogger;

/***/ }),
/* 5 */
/***/ (function(module, exports) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/* global NAF */

	var Schemas = function () {
	  function Schemas() {
	    _classCallCheck(this, Schemas);

	    this.schemaDict = {};
	    this.templateCache = {};
	  }

	  _createClass(Schemas, [{
	    key: 'createDefaultSchema',
	    value: function createDefaultSchema(name) {
	      return {
	        template: name,
	        components: ['position', 'rotation']
	      };
	    }
	  }, {
	    key: 'add',
	    value: function add(schema) {
	      var rootEl = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : document;

	      if (this.validateSchema(schema)) {
	        this.schemaDict[schema.template] = schema;
	        var templateEl = rootEl.querySelector(schema.template);
	        if (!templateEl) {
	          NAF.log.error('Template el not found for ' + schema.template + ', make sure NAF.schemas.add is called after <a-scene> is defined.');
	          return;
	        }
	        if (!this.validateTemplate(schema, templateEl)) {
	          return;
	        }
	        this.templateCache[schema.template] = document.importNode(templateEl.content, true);
	      } else {
	        NAF.log.error('Schema not valid: ', schema);
	        NAF.log.error('See https://github.com/haydenjameslee/networked-aframe#syncing-custom-components');
	      }
	    }
	  }, {
	    key: 'getCachedTemplate',
	    value: function getCachedTemplate(template) {
	      if (!this.templateIsCached(template)) {
	        if (this.templateExistsInScene(template)) {
	          this.add(this.createDefaultSchema(template));
	        } else {
	          NAF.log.error('Template el for ' + template + ' is not in the scene, add the template to <a-assets> and register with NAF.schemas.add.');
	        }
	      }
	      return this.templateCache[template].firstElementChild.cloneNode(true);
	    }
	  }, {
	    key: 'templateIsCached',
	    value: function templateIsCached(template) {
	      return this.templateCache.hasOwnProperty(template);
	    }
	  }, {
	    key: 'getComponents',
	    value: function getComponents(template) {
	      var components = ['position', 'rotation'];
	      if (this.hasTemplate(template)) {
	        components = this.schemaDict[template].components;
	      }
	      return components;
	    }
	  }, {
	    key: 'hasTemplate',
	    value: function hasTemplate(template) {
	      return this.schemaDict.hasOwnProperty(template);
	    }
	  }, {
	    key: 'templateExistsInScene',
	    value: function templateExistsInScene(templateSelector) {
	      var el = document.querySelector(templateSelector);
	      return el && this.isTemplateTag(el);
	    }
	  }, {
	    key: 'validateSchema',
	    value: function validateSchema(schema) {
	      return schema.hasOwnProperty('template') && schema.hasOwnProperty('components');
	    }
	  }, {
	    key: 'validateTemplate',
	    value: function validateTemplate(schema, el) {
	      if (!this.isTemplateTag(el)) {
	        NAF.log.error('Template for ' + schema.template + ' is not a <template> tag. Instead found: ' + el.tagName);
	        return false;
	      } else if (!this.templateHasOneOrZeroChildren(el)) {
	        NAF.log.error('Template for ' + schema.template + ' has more than one child. Templates must have one direct child element, no more. Template found:', el);
	        return false;
	      } else {
	        return true;
	      }
	    }
	  }, {
	    key: 'isTemplateTag',
	    value: function isTemplateTag(el) {
	      return el.tagName.toLowerCase() === 'template';
	    }
	  }, {
	    key: 'templateHasOneOrZeroChildren',
	    value: function templateHasOneOrZeroChildren(el) {
	      return el.content.childElementCount < 2;
	    }
	  }, {
	    key: 'remove',
	    value: function remove(template) {
	      delete this.schemaDict[template];
	    }
	  }, {
	    key: 'clear',
	    value: function clear() {
	      this.schemaDict = {};
	    }
	  }]);

	  return Schemas;
	}();

	module.exports = Schemas;

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/* global NAF, Event */
	var ChildEntityCache = __webpack_require__(7);

	var _require = __webpack_require__(3),
	    bytesToHex = _require.bytesToHex;

	var FBFullUpdateData = __webpack_require__(8).FullUpdateData;
	var FBUpdateOp = __webpack_require__(16).UpdateOp;

	var fullUpdateDataRef = new FBFullUpdateData();
	var clientIdByteBuf = [];
	clientIdByteBuf.length = 20;

	var NetworkEntities = function () {
	  function NetworkEntities() {
	    _classCallCheck(this, NetworkEntities);

	    this.entities = {};
	    this.childCache = new ChildEntityCache();
	    this.onRemoteEntityCreatedEvent = new Event('remoteEntityCreated');
	    this._persistentFirstSyncs = {};
	    this.positionNormalizer = null;
	    this.positionDenormalizer = null;
	  }

	  _createClass(NetworkEntities, [{
	    key: 'registerEntity',
	    value: function registerEntity(networkId, entity) {
	      this.entities[networkId] = entity;
	    }
	  }, {
	    key: 'createRemoteEntity',
	    value: function createRemoteEntity(updateRef) {
	      var networkId = updateRef.networkId();
	      var fullUpdateData = updateRef.fullUpdateData(fullUpdateDataRef);
	      var template = fullUpdateData.template();

	      NAF.log.write('Creating remote entity', networkId, template);

	      var el = NAF.schemas.getCachedTemplate(template);

	      this.addNetworkComponent(el, updateRef);

	      return el;
	    }
	  }, {
	    key: 'addNetworkComponent',
	    value: function addNetworkComponent(entity, updateRef) {
	      var networkId = updateRef.networkId();
	      var fullUpdateData = updateRef.fullUpdateData(fullUpdateDataRef);

	      for (var i = 0; i < 20; i++) {
	        clientIdByteBuf[i] = updateRef.owner(i);
	      }

	      var owner = bytesToHex(clientIdByteBuf);

	      for (var _i = 0; _i < 20; _i++) {
	        clientIdByteBuf[_i] = fullUpdateData.creator(_i);
	      }

	      var creator = bytesToHex(clientIdByteBuf);
	      var template = fullUpdateData.template();
	      var persistent = fullUpdateData.persistent();

	      // Clone update ref, since reference will be re-used
	      entity.firstUpdateRef = new FBUpdateOp();
	      entity.firstUpdateRef.bb = updateRef.bb;
	      entity.firstUpdateRef.bb_pos = updateRef.bb_pos;

	      entity.setAttribute('networked', { template: template, owner: owner, creator: creator, networkId: networkId, persistent: persistent });
	    }
	  }, {
	    key: 'updateEntity',
	    value: function updateEntity(updateRef, sender) {
	      var isFullSync = updateRef.fullUpdateData(fullUpdateDataRef) != null;
	      var networkId = updateRef.networkId();

	      for (var i = 0; i < 20; i++) {
	        clientIdByteBuf[i] = updateRef.owner(i);
	      }

	      var owner = bytesToHex(clientIdByteBuf);

	      if (this.hasEntity(networkId)) {
	        var entity = this.entities[networkId];
	        entity.components.networked.networkUpdate(updateRef, sender);
	      } else if (isFullSync && NAF.connection.activeDataChannels[owner] !== false) {
	        if (NAF.connection.adapter.authorizeCreateEntity(fullUpdateDataRef.template(), sender)) {
	          this.receiveFirstUpdateFromEntity(updateRef, fullUpdateDataRef);
	        }
	      }
	    }
	  }, {
	    key: 'receiveFirstUpdateFromEntity',
	    value: function receiveFirstUpdateFromEntity(updateRef, fullUpdateDataRef) {
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
	  }, {
	    key: 'createAndAppendChildren',
	    value: function createAndAppendChildren(parentId, parentEntity) {
	      var children = this.childCache.getChildren(parentId);
	      for (var i = 0; i < children.length; i++) {
	        var childEntityUpdateRef = children[i];
	        var childId = childEntityUpdateRef.networkId();
	        if (this.hasEntity(childId)) {
	          NAF.log.warn('Tried to instantiate entity multiple times', childId, 'Existing entity:', this.getEntity(childId));
	          continue;
	        }
	        var childEntity = this.createRemoteEntity(childEntityUpdateRef);
	        this.createAndAppendChildren(childId, childEntity);
	        parentEntity.appendChild(childEntity);
	      }
	    }
	  }, {
	    key: 'addEntityToPage',
	    value: function addEntityToPage(entity, parentId) {
	      if (this.hasEntity(parentId)) {
	        this.addEntityToParent(entity, parentId);
	      } else {
	        this.addEntityToSceneRoot(entity);
	      }
	    }
	  }, {
	    key: 'addEntityToParent',
	    value: function addEntityToParent(entity, parentId) {
	      this.entities[parentId].appendChild(entity);
	    }
	  }, {
	    key: 'addEntityToSceneRoot',
	    value: function addEntityToSceneRoot(el) {
	      var scene = AFRAME.scenes[0];
	      scene.appendChild(el);
	    }
	  }, {
	    key: 'completeSync',
	    value: function completeSync(targetClientId, isFirstSync) {
	      for (var id in this.entities) {
	        if (this.entities.hasOwnProperty(id)) {
	          this.entities[id].components.networked.syncAll(targetClientId);
	        }
	      }
	    }
	  }, {
	    key: 'removeRemoteEntity',
	    value: function removeRemoteEntity(deleteRef, sender) {
	      var networkId = deleteRef.networkId();
	      var entity = this.entities[networkId];

	      if (!entity) return;

	      if (!NAF.connection.adapter.authorizeEntityManipulation(entity, sender)) return;
	      return this.removeEntity(networkId);
	    }
	  }, {
	    key: 'removeEntitiesOfClient',
	    value: function removeEntitiesOfClient(clientId) {
	      var entityList = [];
	      for (var id in this.entities) {
	        var entityCreator = NAF.utils.getCreator(this.entities[id]);
	        if (entityCreator === clientId) {
	          var persists = void 0;
	          var component = this.entities[id].getAttribute('networked');
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
	  }, {
	    key: 'removeEntity',
	    value: function removeEntity(id) {
	      if (!this.hasEntity(id)) {
	        NAF.log.error("Tried to remove entity I don't have.");
	        return null;
	      }

	      var entity = this.entities[id];

	      // Remove elements from the bottom up, so A-frame detached them appropriately
	      var walk = function walk(n) {
	        var children = n.children;

	        for (var i = 0; i < children.length; i++) {
	          walk(children[i]);
	        }

	        if (n.parentNode) {
	          n.parentNode.removeChild(n);
	        }
	      };

	      walk(entity);

	      return entity;
	    }
	  }, {
	    key: 'forgetEntity',
	    value: function forgetEntity(id) {
	      delete this.entities[id];
	    }
	  }, {
	    key: 'getEntity',
	    value: function getEntity(id) {
	      if (!this.hasEntity(id)) return null;
	      return this.entities[id];
	    }

	    // Returns true if an entity with the given network id has been registered,
	    // which means it is valid and its networked component has been initialized.

	  }, {
	    key: 'hasEntity',
	    value: function hasEntity(id) {
	      return this.entities.hasOwnProperty(id);
	    }
	  }, {
	    key: 'removeRemoteEntities',
	    value: function removeRemoteEntities() {
	      var includeOwned = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
	      var excludeEntities = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

	      this.childCache = new ChildEntityCache();

	      for (var id in this.entities) {
	        var entity = this.entities[id];
	        if (excludeEntities.includes(entity)) continue;

	        var owner = entity.getAttribute('networked').owner;

	        if (includeOwned || owner !== NAF.clientId) {
	          this.removeEntity(id);
	        }
	      }
	    }
	  }, {
	    key: 'setPositionNormalizer',
	    value: function setPositionNormalizer(normalizer) {
	      this.positionNormalizer = normalizer;
	    }
	  }, {
	    key: 'setPositionDenormalizer',
	    value: function setPositionDenormalizer(denormalizer) {
	      this.positionDenormalizer = denormalizer;
	    }
	  }]);

	  return NetworkEntities;
	}();

	module.exports = NetworkEntities;

/***/ }),
/* 7 */
/***/ (function(module, exports) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var ChildEntityCache = function () {
	  function ChildEntityCache() {
	    _classCallCheck(this, ChildEntityCache);

	    this.dict = {};
	  }

	  _createClass(ChildEntityCache, [{
	    key: "addChild",
	    value: function addChild(parentNetworkId, childData) {
	      if (!this.hasParent(parentNetworkId)) {
	        this.dict[parentNetworkId] = [];
	      }
	      this.dict[parentNetworkId].push(childData);
	    }
	  }, {
	    key: "getChildren",
	    value: function getChildren(parentNetworkId) {
	      if (!this.hasParent(parentNetworkId)) {
	        return [];
	      }
	      var children = this.dict[parentNetworkId];
	      delete this.dict[parentNetworkId];
	      return children;
	    }

	    /* Private */

	  }, {
	    key: "hasParent",
	    value: function hasParent(parentId) {
	      return this.dict.hasOwnProperty(parentId);
	    }
	  }]);

	  return ChildEntityCache;
	}();

	module.exports = ChildEntityCache;

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.FullUpdateDataT = exports.FullUpdateData = void 0;
	var flatbuffers = __webpack_require__(9);
	var FullUpdateData = /** @class */function () {
	    function FullUpdateData() {
	        this.bb = null;
	        this.bb_pos = 0;
	    }
	    FullUpdateData.prototype.__init = function (i, bb) {
	        this.bb_pos = i;
	        this.bb = bb;
	        return this;
	    };
	    FullUpdateData.getRootAsFullUpdateData = function (bb, obj) {
	        return (obj || new FullUpdateData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    FullUpdateData.getSizePrefixedRootAsFullUpdateData = function (bb, obj) {
	        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
	        return (obj || new FullUpdateData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    FullUpdateData.prototype.creator = function (index) {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
	    };
	    FullUpdateData.prototype.creatorLength = function () {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
	    };
	    FullUpdateData.prototype.creatorArray = function () {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? new Uint8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
	    };
	    FullUpdateData.prototype.template = function (optionalEncoding) {
	        var offset = this.bb.__offset(this.bb_pos, 6);
	        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
	    };
	    FullUpdateData.prototype.persistent = function () {
	        var offset = this.bb.__offset(this.bb_pos, 8);
	        return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
	    };
	    FullUpdateData.prototype.parentId = function (optionalEncoding) {
	        var offset = this.bb.__offset(this.bb_pos, 10);
	        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
	    };
	    FullUpdateData.startFullUpdateData = function (builder) {
	        builder.startObject(4);
	    };
	    FullUpdateData.addCreator = function (builder, creatorOffset) {
	        builder.addFieldOffset(0, creatorOffset, 0);
	    };
	    FullUpdateData.createCreatorVector = function (builder, data) {
	        builder.startVector(1, data.length, 1);
	        for (var i = data.length - 1; i >= 0; i--) {
	            builder.addInt8(data[i]);
	        }
	        return builder.endVector();
	    };
	    FullUpdateData.startCreatorVector = function (builder, numElems) {
	        builder.startVector(1, numElems, 1);
	    };
	    FullUpdateData.addTemplate = function (builder, templateOffset) {
	        builder.addFieldOffset(1, templateOffset, 0);
	    };
	    FullUpdateData.addPersistent = function (builder, persistent) {
	        builder.addFieldInt8(2, +persistent, +false);
	    };
	    FullUpdateData.addParentId = function (builder, parentIdOffset) {
	        builder.addFieldOffset(3, parentIdOffset, 0);
	    };
	    FullUpdateData.endFullUpdateData = function (builder) {
	        var offset = builder.endObject();
	        builder.requiredField(offset, 4); // creator
	        builder.requiredField(offset, 6); // template
	        return offset;
	    };
	    FullUpdateData.createFullUpdateData = function (builder, creatorOffset, templateOffset, persistent, parentIdOffset) {
	        FullUpdateData.startFullUpdateData(builder);
	        FullUpdateData.addCreator(builder, creatorOffset);
	        FullUpdateData.addTemplate(builder, templateOffset);
	        FullUpdateData.addPersistent(builder, persistent);
	        FullUpdateData.addParentId(builder, parentIdOffset);
	        return FullUpdateData.endFullUpdateData(builder);
	    };
	    FullUpdateData.prototype.unpack = function () {
	        return new FullUpdateDataT(this.bb.createScalarList(this.creator.bind(this), this.creatorLength()), this.template(), this.persistent(), this.parentId());
	    };
	    FullUpdateData.prototype.unpackTo = function (_o) {
	        _o.creator = this.bb.createScalarList(this.creator.bind(this), this.creatorLength());
	        _o.template = this.template();
	        _o.persistent = this.persistent();
	        _o.parentId = this.parentId();
	    };
	    return FullUpdateData;
	}();
	exports.FullUpdateData = FullUpdateData;
	var FullUpdateDataT = /** @class */function () {
	    function FullUpdateDataT(creator, template, persistent, parentId) {
	        if (creator === void 0) {
	            creator = [];
	        }
	        if (template === void 0) {
	            template = null;
	        }
	        if (persistent === void 0) {
	            persistent = false;
	        }
	        if (parentId === void 0) {
	            parentId = null;
	        }
	        this.creator = creator;
	        this.template = template;
	        this.persistent = persistent;
	        this.parentId = parentId;
	    }
	    FullUpdateDataT.prototype.pack = function (builder) {
	        var creator = FullUpdateData.createCreatorVector(builder, this.creator);
	        var template = this.template !== null ? builder.createString(this.template) : 0;
	        var parentId = this.parentId !== null ? builder.createString(this.parentId) : 0;
	        return FullUpdateData.createFullUpdateData(builder, creator, template, this.persistent, parentId);
	    };
	    return FullUpdateDataT;
	}();
	exports.FullUpdateDataT = FullUpdateDataT;

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ByteBuffer = exports.Builder = exports.Encoding = exports.createLong = exports.Long = exports.isLittleEndian = exports.float64 = exports.float32 = exports.int32 = exports.SIZE_PREFIX_LENGTH = exports.FILE_IDENTIFIER_LENGTH = exports.SIZEOF_INT = exports.SIZEOF_SHORT = void 0;
	var constants_1 = __webpack_require__(10);
	Object.defineProperty(exports, "SIZEOF_SHORT", { enumerable: true, get: function get() {
	    return constants_1.SIZEOF_SHORT;
	  } });
	var constants_2 = __webpack_require__(10);
	Object.defineProperty(exports, "SIZEOF_INT", { enumerable: true, get: function get() {
	    return constants_2.SIZEOF_INT;
	  } });
	var constants_3 = __webpack_require__(10);
	Object.defineProperty(exports, "FILE_IDENTIFIER_LENGTH", { enumerable: true, get: function get() {
	    return constants_3.FILE_IDENTIFIER_LENGTH;
	  } });
	var constants_4 = __webpack_require__(10);
	Object.defineProperty(exports, "SIZE_PREFIX_LENGTH", { enumerable: true, get: function get() {
	    return constants_4.SIZE_PREFIX_LENGTH;
	  } });
	var utils_1 = __webpack_require__(11);
	Object.defineProperty(exports, "int32", { enumerable: true, get: function get() {
	    return utils_1.int32;
	  } });
	Object.defineProperty(exports, "float32", { enumerable: true, get: function get() {
	    return utils_1.float32;
	  } });
	Object.defineProperty(exports, "float64", { enumerable: true, get: function get() {
	    return utils_1.float64;
	  } });
	Object.defineProperty(exports, "isLittleEndian", { enumerable: true, get: function get() {
	    return utils_1.isLittleEndian;
	  } });
	var long_1 = __webpack_require__(12);
	Object.defineProperty(exports, "Long", { enumerable: true, get: function get() {
	    return long_1.Long;
	  } });
	Object.defineProperty(exports, "createLong", { enumerable: true, get: function get() {
	    return long_1.createLong;
	  } });
	var encoding_1 = __webpack_require__(13);
	Object.defineProperty(exports, "Encoding", { enumerable: true, get: function get() {
	    return encoding_1.Encoding;
	  } });
	var builder_1 = __webpack_require__(14);
	Object.defineProperty(exports, "Builder", { enumerable: true, get: function get() {
	    return builder_1.Builder;
	  } });
	var byte_buffer_1 = __webpack_require__(15);
	Object.defineProperty(exports, "ByteBuffer", { enumerable: true, get: function get() {
	    return byte_buffer_1.ByteBuffer;
	  } });

/***/ }),
/* 10 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.SIZE_PREFIX_LENGTH = exports.FILE_IDENTIFIER_LENGTH = exports.SIZEOF_INT = exports.SIZEOF_SHORT = void 0;
	exports.SIZEOF_SHORT = 2;
	exports.SIZEOF_INT = 4;
	exports.FILE_IDENTIFIER_LENGTH = 4;
	exports.SIZE_PREFIX_LENGTH = 4;

/***/ }),
/* 11 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.isLittleEndian = exports.float64 = exports.float32 = exports.int32 = void 0;
	exports.int32 = new Int32Array(2);
	exports.float32 = new Float32Array(exports.int32.buffer);
	exports.float64 = new Float64Array(exports.int32.buffer);
	exports.isLittleEndian = new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;

/***/ }),
/* 12 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Long = exports.createLong = void 0;
	function createLong(low, high) {
	    return Long.create(low, high);
	}
	exports.createLong = createLong;
	var Long = /** @class */function () {
	    function Long(low, high) {
	        this.low = low | 0;
	        this.high = high | 0;
	    }
	    Long.create = function (low, high) {
	        // Special-case zero to avoid GC overhead for default values
	        return low == 0 && high == 0 ? Long.ZERO : new Long(low, high);
	    };
	    Long.prototype.toFloat64 = function () {
	        return (this.low >>> 0) + this.high * 0x100000000;
	    };
	    Long.prototype.equals = function (other) {
	        return this.low == other.low && this.high == other.high;
	    };
	    Long.ZERO = new Long(0, 0);
	    return Long;
	}();
	exports.Long = Long;

/***/ }),
/* 13 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Encoding = void 0;
	var Encoding;
	(function (Encoding) {
	    Encoding[Encoding["UTF8_BYTES"] = 1] = "UTF8_BYTES";
	    Encoding[Encoding["UTF16_STRING"] = 2] = "UTF16_STRING";
	})(Encoding = exports.Encoding || (exports.Encoding = {}));

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Builder = void 0;
	var byte_buffer_1 = __webpack_require__(15);
	var constants_1 = __webpack_require__(10);
	var long_1 = __webpack_require__(12);
	var Builder = /** @class */function () {
	    /**
	     * Create a FlatBufferBuilder.
	     */
	    function Builder(opt_initial_size) {
	        /** Minimum alignment encountered so far. */
	        this.minalign = 1;
	        /** The vtable for the current table. */
	        this.vtable = null;
	        /** The amount of fields we're actually using. */
	        this.vtable_in_use = 0;
	        /** Whether we are currently serializing a table. */
	        this.isNested = false;
	        /** Starting offset of the current struct/table. */
	        this.object_start = 0;
	        /** List of offsets of all vtables. */
	        this.vtables = [];
	        /** For the current vector being built. */
	        this.vector_num_elems = 0;
	        /** False omits default values from the serialized data */
	        this.force_defaults = false;
	        this.string_maps = null;
	        var initial_size;
	        if (!opt_initial_size) {
	            initial_size = 1024;
	        } else {
	            initial_size = opt_initial_size;
	        }
	        /**
	         * @type {ByteBuffer}
	         * @private
	         */
	        this.bb = byte_buffer_1.ByteBuffer.allocate(initial_size);
	        this.space = initial_size;
	    }
	    Builder.prototype.clear = function () {
	        this.bb.clear();
	        this.space = this.bb.capacity();
	        this.minalign = 1;
	        this.vtable = null;
	        this.vtable_in_use = 0;
	        this.isNested = false;
	        this.object_start = 0;
	        this.vtables = [];
	        this.vector_num_elems = 0;
	        this.force_defaults = false;
	        this.string_maps = null;
	    };
	    /**
	     * In order to save space, fields that are set to their default value
	     * don't get serialized into the buffer. Forcing defaults provides a
	     * way to manually disable this optimization.
	     *
	     * @param forceDefaults true always serializes default values
	     */
	    Builder.prototype.forceDefaults = function (forceDefaults) {
	        this.force_defaults = forceDefaults;
	    };
	    /**
	     * Get the ByteBuffer representing the FlatBuffer. Only call this after you've
	     * called finish(). The actual data starts at the ByteBuffer's current position,
	     * not necessarily at 0.
	     */
	    Builder.prototype.dataBuffer = function () {
	        return this.bb;
	    };
	    /**
	     * Get the bytes representing the FlatBuffer. Only call this after you've
	     * called finish().
	     */
	    Builder.prototype.asUint8Array = function () {
	        return this.bb.bytes().subarray(this.bb.position(), this.bb.position() + this.offset());
	    };
	    /**
	     * Prepare to write an element of `size` after `additional_bytes` have been
	     * written, e.g. if you write a string, you need to align such the int length
	     * field is aligned to 4 bytes, and the string data follows it directly. If all
	     * you need to do is alignment, `additional_bytes` will be 0.
	     *
	     * @param size This is the of the new element to write
	     * @param additional_bytes The padding size
	     */
	    Builder.prototype.prep = function (size, additional_bytes) {
	        // Track the biggest thing we've ever aligned to.
	        if (size > this.minalign) {
	            this.minalign = size;
	        }
	        // Find the amount of alignment needed such that `size` is properly
	        // aligned after `additional_bytes`
	        var align_size = ~(this.bb.capacity() - this.space + additional_bytes) + 1 & size - 1;
	        // Reallocate the buffer if needed.
	        while (this.space < align_size + size + additional_bytes) {
	            var old_buf_size = this.bb.capacity();
	            this.bb = Builder.growByteBuffer(this.bb);
	            this.space += this.bb.capacity() - old_buf_size;
	        }
	        this.pad(align_size);
	    };
	    Builder.prototype.pad = function (byte_size) {
	        for (var i = 0; i < byte_size; i++) {
	            this.bb.writeInt8(--this.space, 0);
	        }
	    };
	    Builder.prototype.writeInt8 = function (value) {
	        this.bb.writeInt8(this.space -= 1, value);
	    };
	    Builder.prototype.writeInt16 = function (value) {
	        this.bb.writeInt16(this.space -= 2, value);
	    };
	    Builder.prototype.writeInt32 = function (value) {
	        this.bb.writeInt32(this.space -= 4, value);
	    };
	    Builder.prototype.writeInt64 = function (value) {
	        this.bb.writeInt64(this.space -= 8, value);
	    };
	    Builder.prototype.writeFloat32 = function (value) {
	        this.bb.writeFloat32(this.space -= 4, value);
	    };
	    Builder.prototype.writeFloat64 = function (value) {
	        this.bb.writeFloat64(this.space -= 8, value);
	    };
	    /**
	     * Add an `int8` to the buffer, properly aligned, and grows the buffer (if necessary).
	     * @param value The `int8` to add the the buffer.
	     */
	    Builder.prototype.addInt8 = function (value) {
	        this.prep(1, 0);
	        this.writeInt8(value);
	    };
	    /**
	     * Add an `int16` to the buffer, properly aligned, and grows the buffer (if necessary).
	     * @param value The `int16` to add the the buffer.
	     */
	    Builder.prototype.addInt16 = function (value) {
	        this.prep(2, 0);
	        this.writeInt16(value);
	    };
	    /**
	     * Add an `int32` to the buffer, properly aligned, and grows the buffer (if necessary).
	     * @param value The `int32` to add the the buffer.
	     */
	    Builder.prototype.addInt32 = function (value) {
	        this.prep(4, 0);
	        this.writeInt32(value);
	    };
	    /**
	     * Add an `int64` to the buffer, properly aligned, and grows the buffer (if necessary).
	     * @param value The `int64` to add the the buffer.
	     */
	    Builder.prototype.addInt64 = function (value) {
	        this.prep(8, 0);
	        this.writeInt64(value);
	    };
	    /**
	     * Add a `float32` to the buffer, properly aligned, and grows the buffer (if necessary).
	     * @param value The `float32` to add the the buffer.
	     */
	    Builder.prototype.addFloat32 = function (value) {
	        this.prep(4, 0);
	        this.writeFloat32(value);
	    };
	    /**
	     * Add a `float64` to the buffer, properly aligned, and grows the buffer (if necessary).
	     * @param value The `float64` to add the the buffer.
	     */
	    Builder.prototype.addFloat64 = function (value) {
	        this.prep(8, 0);
	        this.writeFloat64(value);
	    };
	    Builder.prototype.addFieldInt8 = function (voffset, value, defaultValue) {
	        if (this.force_defaults || value != defaultValue) {
	            this.addInt8(value);
	            this.slot(voffset);
	        }
	    };
	    Builder.prototype.addFieldInt16 = function (voffset, value, defaultValue) {
	        if (this.force_defaults || value != defaultValue) {
	            this.addInt16(value);
	            this.slot(voffset);
	        }
	    };
	    Builder.prototype.addFieldInt32 = function (voffset, value, defaultValue) {
	        if (this.force_defaults || value != defaultValue) {
	            this.addInt32(value);
	            this.slot(voffset);
	        }
	    };
	    Builder.prototype.addFieldInt64 = function (voffset, value, defaultValue) {
	        if (this.force_defaults || !value.equals(defaultValue)) {
	            this.addInt64(value);
	            this.slot(voffset);
	        }
	    };
	    Builder.prototype.addFieldFloat32 = function (voffset, value, defaultValue) {
	        if (this.force_defaults || value != defaultValue) {
	            this.addFloat32(value);
	            this.slot(voffset);
	        }
	    };
	    Builder.prototype.addFieldFloat64 = function (voffset, value, defaultValue) {
	        if (this.force_defaults || value != defaultValue) {
	            this.addFloat64(value);
	            this.slot(voffset);
	        }
	    };
	    Builder.prototype.addFieldOffset = function (voffset, value, defaultValue) {
	        if (this.force_defaults || value != defaultValue) {
	            this.addOffset(value);
	            this.slot(voffset);
	        }
	    };
	    /**
	     * Structs are stored inline, so nothing additional is being added. `d` is always 0.
	     */
	    Builder.prototype.addFieldStruct = function (voffset, value, defaultValue) {
	        if (value != defaultValue) {
	            this.nested(value);
	            this.slot(voffset);
	        }
	    };
	    /**
	     * Structures are always stored inline, they need to be created right
	     * where they're used.  You'll get this assertion failure if you
	     * created it elsewhere.
	     */
	    Builder.prototype.nested = function (obj) {
	        if (obj != this.offset()) {
	            throw new Error('FlatBuffers: struct must be serialized inline.');
	        }
	    };
	    /**
	     * Should not be creating any other object, string or vector
	     * while an object is being constructed
	     */
	    Builder.prototype.notNested = function () {
	        if (this.isNested) {
	            throw new Error('FlatBuffers: object serialization must not be nested.');
	        }
	    };
	    /**
	     * Set the current vtable at `voffset` to the current location in the buffer.
	     */
	    Builder.prototype.slot = function (voffset) {
	        if (this.vtable !== null) this.vtable[voffset] = this.offset();
	    };
	    /**
	     * @returns Offset relative to the end of the buffer.
	     */
	    Builder.prototype.offset = function () {
	        return this.bb.capacity() - this.space;
	    };
	    /**
	     * Doubles the size of the backing ByteBuffer and copies the old data towards
	     * the end of the new buffer (since we build the buffer backwards).
	     *
	     * @param bb The current buffer with the existing data
	     * @returns A new byte buffer with the old data copied
	     * to it. The data is located at the end of the buffer.
	     *
	     * uint8Array.set() formally takes {Array<number>|ArrayBufferView}, so to pass
	     * it a uint8Array we need to suppress the type check:
	     * @suppress {checkTypes}
	     */
	    Builder.growByteBuffer = function (bb) {
	        var old_buf_size = bb.capacity();
	        // Ensure we don't grow beyond what fits in an int.
	        if (old_buf_size & 0xC0000000) {
	            throw new Error('FlatBuffers: cannot grow buffer beyond 2 gigabytes.');
	        }
	        var new_buf_size = old_buf_size << 1;
	        var nbb = byte_buffer_1.ByteBuffer.allocate(new_buf_size);
	        nbb.setPosition(new_buf_size - old_buf_size);
	        nbb.bytes().set(bb.bytes(), new_buf_size - old_buf_size);
	        return nbb;
	    };
	    /**
	     * Adds on offset, relative to where it will be written.
	     *
	     * @param offset The offset to add.
	     */
	    Builder.prototype.addOffset = function (offset) {
	        this.prep(constants_1.SIZEOF_INT, 0); // Ensure alignment is already done.
	        this.writeInt32(this.offset() - offset + constants_1.SIZEOF_INT);
	    };
	    /**
	     * Start encoding a new object in the buffer.  Users will not usually need to
	     * call this directly. The FlatBuffers compiler will generate helper methods
	     * that call this method internally.
	     */
	    Builder.prototype.startObject = function (numfields) {
	        this.notNested();
	        if (this.vtable == null) {
	            this.vtable = [];
	        }
	        this.vtable_in_use = numfields;
	        for (var i = 0; i < numfields; i++) {
	            this.vtable[i] = 0; // This will push additional elements as needed
	        }
	        this.isNested = true;
	        this.object_start = this.offset();
	    };
	    /**
	     * Finish off writing the object that is under construction.
	     *
	     * @returns The offset to the object inside `dataBuffer`
	     */
	    Builder.prototype.endObject = function () {
	        if (this.vtable == null || !this.isNested) {
	            throw new Error('FlatBuffers: endObject called without startObject');
	        }
	        this.addInt32(0);
	        var vtableloc = this.offset();
	        // Trim trailing zeroes.
	        var i = this.vtable_in_use - 1;
	        // eslint-disable-next-line no-empty
	        for (; i >= 0 && this.vtable[i] == 0; i--) {}
	        var trimmed_size = i + 1;
	        // Write out the current vtable.
	        for (; i >= 0; i--) {
	            // Offset relative to the start of the table.
	            this.addInt16(this.vtable[i] != 0 ? vtableloc - this.vtable[i] : 0);
	        }
	        var standard_fields = 2; // The fields below:
	        this.addInt16(vtableloc - this.object_start);
	        var len = (trimmed_size + standard_fields) * constants_1.SIZEOF_SHORT;
	        this.addInt16(len);
	        // Search for an existing vtable that matches the current one.
	        var existing_vtable = 0;
	        var vt1 = this.space;
	        outer_loop: for (i = 0; i < this.vtables.length; i++) {
	            var vt2 = this.bb.capacity() - this.vtables[i];
	            if (len == this.bb.readInt16(vt2)) {
	                for (var j = constants_1.SIZEOF_SHORT; j < len; j += constants_1.SIZEOF_SHORT) {
	                    if (this.bb.readInt16(vt1 + j) != this.bb.readInt16(vt2 + j)) {
	                        continue outer_loop;
	                    }
	                }
	                existing_vtable = this.vtables[i];
	                break;
	            }
	        }
	        if (existing_vtable) {
	            // Found a match:
	            // Remove the current vtable.
	            this.space = this.bb.capacity() - vtableloc;
	            // Point table to existing vtable.
	            this.bb.writeInt32(this.space, existing_vtable - vtableloc);
	        } else {
	            // No match:
	            // Add the location of the current vtable to the list of vtables.
	            this.vtables.push(this.offset());
	            // Point table to current vtable.
	            this.bb.writeInt32(this.bb.capacity() - vtableloc, this.offset() - vtableloc);
	        }
	        this.isNested = false;
	        return vtableloc;
	    };
	    /**
	     * Finalize a buffer, poiting to the given `root_table`.
	     */
	    Builder.prototype.finish = function (root_table, opt_file_identifier, opt_size_prefix) {
	        var size_prefix = opt_size_prefix ? constants_1.SIZE_PREFIX_LENGTH : 0;
	        if (opt_file_identifier) {
	            var file_identifier = opt_file_identifier;
	            this.prep(this.minalign, constants_1.SIZEOF_INT + constants_1.FILE_IDENTIFIER_LENGTH + size_prefix);
	            if (file_identifier.length != constants_1.FILE_IDENTIFIER_LENGTH) {
	                throw new Error('FlatBuffers: file identifier must be length ' + constants_1.FILE_IDENTIFIER_LENGTH);
	            }
	            for (var i = constants_1.FILE_IDENTIFIER_LENGTH - 1; i >= 0; i--) {
	                this.writeInt8(file_identifier.charCodeAt(i));
	            }
	        }
	        this.prep(this.minalign, constants_1.SIZEOF_INT + size_prefix);
	        this.addOffset(root_table);
	        if (size_prefix) {
	            this.addInt32(this.bb.capacity() - this.space);
	        }
	        this.bb.setPosition(this.space);
	    };
	    /**
	     * Finalize a size prefixed buffer, pointing to the given `root_table`.
	     */
	    Builder.prototype.finishSizePrefixed = function (root_table, opt_file_identifier) {
	        this.finish(root_table, opt_file_identifier, true);
	    };
	    /**
	     * This checks a required field has been set in a given table that has
	     * just been constructed.
	     */
	    Builder.prototype.requiredField = function (table, field) {
	        var table_start = this.bb.capacity() - table;
	        var vtable_start = table_start - this.bb.readInt32(table_start);
	        var ok = this.bb.readInt16(vtable_start + field) != 0;
	        // If this fails, the caller will show what field needs to be set.
	        if (!ok) {
	            throw new Error('FlatBuffers: field ' + field + ' must be set');
	        }
	    };
	    /**
	     * Start a new array/vector of objects.  Users usually will not call
	     * this directly. The FlatBuffers compiler will create a start/end
	     * method for vector types in generated code.
	     *
	     * @param elem_size The size of each element in the array
	     * @param num_elems The number of elements in the array
	     * @param alignment The alignment of the array
	     */
	    Builder.prototype.startVector = function (elem_size, num_elems, alignment) {
	        this.notNested();
	        this.vector_num_elems = num_elems;
	        this.prep(constants_1.SIZEOF_INT, elem_size * num_elems);
	        this.prep(alignment, elem_size * num_elems); // Just in case alignment > int.
	    };
	    /**
	     * Finish off the creation of an array and all its elements. The array must be
	     * created with `startVector`.
	     *
	     * @returns The offset at which the newly created array
	     * starts.
	     */
	    Builder.prototype.endVector = function () {
	        this.writeInt32(this.vector_num_elems);
	        return this.offset();
	    };
	    /**
	     * Encode the string `s` in the buffer using UTF-8. If the string passed has
	     * already been seen, we return the offset of the already written string
	     *
	     * @param s The string to encode
	     * @return The offset in the buffer where the encoded string starts
	     */
	    Builder.prototype.createSharedString = function (s) {
	        if (!s) {
	            return 0;
	        }
	        if (!this.string_maps) {
	            this.string_maps = new Map();
	        }
	        if (this.string_maps.has(s)) {
	            return this.string_maps.get(s);
	        }
	        var offset = this.createString(s);
	        this.string_maps.set(s, offset);
	        return offset;
	    };
	    /**
	     * Encode the string `s` in the buffer using UTF-8. If a Uint8Array is passed
	     * instead of a string, it is assumed to contain valid UTF-8 encoded data.
	     *
	     * @param s The string to encode
	     * @return The offset in the buffer where the encoded string starts
	     */
	    Builder.prototype.createString = function (s) {
	        if (!s) {
	            return 0;
	        }
	        var utf8;
	        if (s instanceof Uint8Array) {
	            utf8 = s;
	        } else {
	            utf8 = [];
	            var i = 0;
	            while (i < s.length) {
	                var codePoint = void 0;
	                // Decode UTF-16
	                var a = s.charCodeAt(i++);
	                if (a < 0xD800 || a >= 0xDC00) {
	                    codePoint = a;
	                } else {
	                    var b = s.charCodeAt(i++);
	                    codePoint = (a << 10) + b + (0x10000 - (0xD800 << 10) - 0xDC00);
	                }
	                // Encode UTF-8
	                if (codePoint < 0x80) {
	                    utf8.push(codePoint);
	                } else {
	                    if (codePoint < 0x800) {
	                        utf8.push(codePoint >> 6 & 0x1F | 0xC0);
	                    } else {
	                        if (codePoint < 0x10000) {
	                            utf8.push(codePoint >> 12 & 0x0F | 0xE0);
	                        } else {
	                            utf8.push(codePoint >> 18 & 0x07 | 0xF0, codePoint >> 12 & 0x3F | 0x80);
	                        }
	                        utf8.push(codePoint >> 6 & 0x3F | 0x80);
	                    }
	                    utf8.push(codePoint & 0x3F | 0x80);
	                }
	            }
	        }
	        this.addInt8(0);
	        this.startVector(1, utf8.length, 1);
	        this.bb.setPosition(this.space -= utf8.length);
	        for (var i = 0, offset = this.space, bytes = this.bb.bytes(); i < utf8.length; i++) {
	            bytes[offset++] = utf8[i];
	        }
	        return this.endVector();
	    };
	    /**
	     * A helper function to avoid generated code depending on this file directly.
	     */
	    Builder.prototype.createLong = function (low, high) {
	        return long_1.Long.create(low, high);
	    };
	    /**
	     * A helper function to pack an object
	     *
	     * @returns offset of obj
	     */
	    Builder.prototype.createObjectOffset = function (obj) {
	        if (obj === null) {
	            return 0;
	        }
	        if (typeof obj === 'string') {
	            return this.createString(obj);
	        } else {
	            return obj.pack(this);
	        }
	    };
	    /**
	     * A helper function to pack a list of object
	     *
	     * @returns list of offsets of each non null object
	     */
	    Builder.prototype.createObjectOffsetList = function (list) {
	        var ret = [];
	        for (var i = 0; i < list.length; ++i) {
	            var val = list[i];
	            if (val !== null) {
	                ret.push(this.createObjectOffset(val));
	            } else {
	                throw new Error('FlatBuffers: Argument for createObjectOffsetList cannot contain null.');
	            }
	        }
	        return ret;
	    };
	    Builder.prototype.createStructOffsetList = function (list, startFunc) {
	        startFunc(this, list.length);
	        this.createObjectOffsetList(list);
	        return this.endVector();
	    };
	    return Builder;
	}();
	exports.Builder = Builder;

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ByteBuffer = void 0;
	var constants_1 = __webpack_require__(10);
	var long_1 = __webpack_require__(12);
	var utils_1 = __webpack_require__(11);
	var encoding_1 = __webpack_require__(13);
	var ByteBuffer = /** @class */function () {
	    /**
	     * Create a new ByteBuffer with a given array of bytes (`Uint8Array`)
	     */
	    function ByteBuffer(bytes_) {
	        this.bytes_ = bytes_;
	        this.position_ = 0;
	    }
	    /**
	     * Create and allocate a new ByteBuffer with a given size.
	     */
	    ByteBuffer.allocate = function (byte_size) {
	        return new ByteBuffer(new Uint8Array(byte_size));
	    };
	    ByteBuffer.prototype.clear = function () {
	        this.position_ = 0;
	    };
	    /**
	     * Get the underlying `Uint8Array`.
	     */
	    ByteBuffer.prototype.bytes = function () {
	        return this.bytes_;
	    };
	    /**
	     * Get the buffer's position.
	     */
	    ByteBuffer.prototype.position = function () {
	        return this.position_;
	    };
	    /**
	     * Set the buffer's position.
	     */
	    ByteBuffer.prototype.setPosition = function (position) {
	        this.position_ = position;
	    };
	    /**
	     * Get the buffer's capacity.
	     */
	    ByteBuffer.prototype.capacity = function () {
	        return this.bytes_.length;
	    };
	    ByteBuffer.prototype.readInt8 = function (offset) {
	        return this.readUint8(offset) << 24 >> 24;
	    };
	    ByteBuffer.prototype.readUint8 = function (offset) {
	        return this.bytes_[offset];
	    };
	    ByteBuffer.prototype.readInt16 = function (offset) {
	        return this.readUint16(offset) << 16 >> 16;
	    };
	    ByteBuffer.prototype.readUint16 = function (offset) {
	        return this.bytes_[offset] | this.bytes_[offset + 1] << 8;
	    };
	    ByteBuffer.prototype.readInt32 = function (offset) {
	        return this.bytes_[offset] | this.bytes_[offset + 1] << 8 | this.bytes_[offset + 2] << 16 | this.bytes_[offset + 3] << 24;
	    };
	    ByteBuffer.prototype.readUint32 = function (offset) {
	        return this.readInt32(offset) >>> 0;
	    };
	    ByteBuffer.prototype.readInt64 = function (offset) {
	        return new long_1.Long(this.readInt32(offset), this.readInt32(offset + 4));
	    };
	    ByteBuffer.prototype.readUint64 = function (offset) {
	        return new long_1.Long(this.readUint32(offset), this.readUint32(offset + 4));
	    };
	    ByteBuffer.prototype.readFloat32 = function (offset) {
	        utils_1.int32[0] = this.readInt32(offset);
	        return utils_1.float32[0];
	    };
	    ByteBuffer.prototype.readFloat64 = function (offset) {
	        utils_1.int32[utils_1.isLittleEndian ? 0 : 1] = this.readInt32(offset);
	        utils_1.int32[utils_1.isLittleEndian ? 1 : 0] = this.readInt32(offset + 4);
	        return utils_1.float64[0];
	    };
	    ByteBuffer.prototype.writeInt8 = function (offset, value) {
	        this.bytes_[offset] = value;
	    };
	    ByteBuffer.prototype.writeUint8 = function (offset, value) {
	        this.bytes_[offset] = value;
	    };
	    ByteBuffer.prototype.writeInt16 = function (offset, value) {
	        this.bytes_[offset] = value;
	        this.bytes_[offset + 1] = value >> 8;
	    };
	    ByteBuffer.prototype.writeUint16 = function (offset, value) {
	        this.bytes_[offset] = value;
	        this.bytes_[offset + 1] = value >> 8;
	    };
	    ByteBuffer.prototype.writeInt32 = function (offset, value) {
	        this.bytes_[offset] = value;
	        this.bytes_[offset + 1] = value >> 8;
	        this.bytes_[offset + 2] = value >> 16;
	        this.bytes_[offset + 3] = value >> 24;
	    };
	    ByteBuffer.prototype.writeUint32 = function (offset, value) {
	        this.bytes_[offset] = value;
	        this.bytes_[offset + 1] = value >> 8;
	        this.bytes_[offset + 2] = value >> 16;
	        this.bytes_[offset + 3] = value >> 24;
	    };
	    ByteBuffer.prototype.writeInt64 = function (offset, value) {
	        this.writeInt32(offset, value.low);
	        this.writeInt32(offset + 4, value.high);
	    };
	    ByteBuffer.prototype.writeUint64 = function (offset, value) {
	        this.writeUint32(offset, value.low);
	        this.writeUint32(offset + 4, value.high);
	    };
	    ByteBuffer.prototype.writeFloat32 = function (offset, value) {
	        utils_1.float32[0] = value;
	        this.writeInt32(offset, utils_1.int32[0]);
	    };
	    ByteBuffer.prototype.writeFloat64 = function (offset, value) {
	        utils_1.float64[0] = value;
	        this.writeInt32(offset, utils_1.int32[utils_1.isLittleEndian ? 0 : 1]);
	        this.writeInt32(offset + 4, utils_1.int32[utils_1.isLittleEndian ? 1 : 0]);
	    };
	    /**
	     * Return the file identifier.   Behavior is undefined for FlatBuffers whose
	     * schema does not include a file_identifier (likely points at padding or the
	     * start of a the root vtable).
	     */
	    ByteBuffer.prototype.getBufferIdentifier = function () {
	        if (this.bytes_.length < this.position_ + constants_1.SIZEOF_INT + constants_1.FILE_IDENTIFIER_LENGTH) {
	            throw new Error('FlatBuffers: ByteBuffer is too short to contain an identifier.');
	        }
	        var result = "";
	        for (var i = 0; i < constants_1.FILE_IDENTIFIER_LENGTH; i++) {
	            result += String.fromCharCode(this.readInt8(this.position_ + constants_1.SIZEOF_INT + i));
	        }
	        return result;
	    };
	    /**
	     * Look up a field in the vtable, return an offset into the object, or 0 if the
	     * field is not present.
	     */
	    ByteBuffer.prototype.__offset = function (bb_pos, vtable_offset) {
	        var vtable = bb_pos - this.readInt32(bb_pos);
	        return vtable_offset < this.readInt16(vtable) ? this.readInt16(vtable + vtable_offset) : 0;
	    };
	    /**
	     * Initialize any Table-derived type to point to the union at the given offset.
	     */
	    ByteBuffer.prototype.__union = function (t, offset) {
	        t.bb_pos = offset + this.readInt32(offset);
	        t.bb = this;
	        return t;
	    };
	    /**
	     * Create a JavaScript string from UTF-8 data stored inside the FlatBuffer.
	     * This allocates a new string and converts to wide chars upon each access.
	     *
	     * To avoid the conversion to UTF-16, pass Encoding.UTF8_BYTES as
	     * the "optionalEncoding" argument. This is useful for avoiding conversion to
	     * and from UTF-16 when the data will just be packaged back up in another
	     * FlatBuffer later on.
	     *
	     * @param offset
	     * @param opt_encoding Defaults to UTF16_STRING
	     */
	    ByteBuffer.prototype.__string = function (offset, opt_encoding) {
	        offset += this.readInt32(offset);
	        var length = this.readInt32(offset);
	        var result = '';
	        var i = 0;
	        offset += constants_1.SIZEOF_INT;
	        if (opt_encoding === encoding_1.Encoding.UTF8_BYTES) {
	            return this.bytes_.subarray(offset, offset + length);
	        }
	        while (i < length) {
	            var codePoint = void 0;
	            // Decode UTF-8
	            var a = this.readUint8(offset + i++);
	            if (a < 0xC0) {
	                codePoint = a;
	            } else {
	                var b = this.readUint8(offset + i++);
	                if (a < 0xE0) {
	                    codePoint = (a & 0x1F) << 6 | b & 0x3F;
	                } else {
	                    var c = this.readUint8(offset + i++);
	                    if (a < 0xF0) {
	                        codePoint = (a & 0x0F) << 12 | (b & 0x3F) << 6 | c & 0x3F;
	                    } else {
	                        var d = this.readUint8(offset + i++);
	                        codePoint = (a & 0x07) << 18 | (b & 0x3F) << 12 | (c & 0x3F) << 6 | d & 0x3F;
	                    }
	                }
	            }
	            // Encode UTF-16
	            if (codePoint < 0x10000) {
	                result += String.fromCharCode(codePoint);
	            } else {
	                codePoint -= 0x10000;
	                result += String.fromCharCode((codePoint >> 10) + 0xD800, (codePoint & (1 << 10) - 1) + 0xDC00);
	            }
	        }
	        return result;
	    };
	    /**
	     * Handle unions that can contain string as its member, if a Table-derived type then initialize it,
	     * if a string then return a new one
	     *
	     * WARNING: strings are immutable in JS so we can't change the string that the user gave us, this
	     * makes the behaviour of __union_with_string different compared to __union
	     */
	    ByteBuffer.prototype.__union_with_string = function (o, offset) {
	        if (typeof o === 'string') {
	            return this.__string(offset);
	        }
	        return this.__union(o, offset);
	    };
	    /**
	     * Retrieve the relative offset stored at "offset"
	     */
	    ByteBuffer.prototype.__indirect = function (offset) {
	        return offset + this.readInt32(offset);
	    };
	    /**
	     * Get the start of data of a vector whose offset is stored at "offset" in this object.
	     */
	    ByteBuffer.prototype.__vector = function (offset) {
	        return offset + this.readInt32(offset) + constants_1.SIZEOF_INT; // data starts after the length
	    };
	    /**
	     * Get the length of a vector whose offset is stored at "offset" in this object.
	     */
	    ByteBuffer.prototype.__vector_len = function (offset) {
	        return this.readInt32(offset + this.readInt32(offset));
	    };
	    ByteBuffer.prototype.__has_identifier = function (ident) {
	        if (ident.length != constants_1.FILE_IDENTIFIER_LENGTH) {
	            throw new Error('FlatBuffers: file identifier must be length ' + constants_1.FILE_IDENTIFIER_LENGTH);
	        }
	        for (var i = 0; i < constants_1.FILE_IDENTIFIER_LENGTH; i++) {
	            if (ident.charCodeAt(i) != this.readInt8(this.position() + constants_1.SIZEOF_INT + i)) {
	                return false;
	            }
	        }
	        return true;
	    };
	    /**
	     * A helper function to avoid generated code depending on this file directly.
	     */
	    ByteBuffer.prototype.createLong = function (low, high) {
	        return long_1.Long.create(low, high);
	    };
	    /**
	     * A helper function for generating list for obj api
	     */
	    ByteBuffer.prototype.createScalarList = function (listAccessor, listLength) {
	        var ret = [];
	        for (var i = 0; i < listLength; ++i) {
	            if (listAccessor(i) !== null) {
	                ret.push(listAccessor(i));
	            }
	        }
	        return ret;
	    };
	    /**
	     * A helper function for generating list for obj api
	     * @param listAccessor function that accepts an index and return data at that index
	     * @param listLength listLength
	     * @param res result list
	     */
	    ByteBuffer.prototype.createObjList = function (listAccessor, listLength) {
	        var ret = [];
	        for (var i = 0; i < listLength; ++i) {
	            var val = listAccessor(i);
	            if (val !== null) {
	                ret.push(val.unpack());
	            }
	        }
	        return ret;
	    };
	    return ByteBuffer;
	}();
	exports.ByteBuffer = ByteBuffer;

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.UpdateOpT = exports.UpdateOp = void 0;
	var flatbuffers = __webpack_require__(9);
	var full_update_data_1 = __webpack_require__(8);
	var UpdateOp = /** @class */function () {
	    function UpdateOp() {
	        this.bb = null;
	        this.bb_pos = 0;
	    }
	    UpdateOp.prototype.__init = function (i, bb) {
	        this.bb_pos = i;
	        this.bb = bb;
	        return this;
	    };
	    UpdateOp.getRootAsUpdateOp = function (bb, obj) {
	        return (obj || new UpdateOp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    UpdateOp.getSizePrefixedRootAsUpdateOp = function (bb, obj) {
	        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
	        return (obj || new UpdateOp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    UpdateOp.prototype.networkId = function (optionalEncoding) {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
	    };
	    UpdateOp.prototype.fullUpdateData = function (obj) {
	        var offset = this.bb.__offset(this.bb_pos, 6);
	        return offset ? (obj || new full_update_data_1.FullUpdateData()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
	    };
	    UpdateOp.prototype.owner = function (index) {
	        var offset = this.bb.__offset(this.bb_pos, 8);
	        return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
	    };
	    UpdateOp.prototype.ownerLength = function () {
	        var offset = this.bb.__offset(this.bb_pos, 8);
	        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
	    };
	    UpdateOp.prototype.ownerArray = function () {
	        var offset = this.bb.__offset(this.bb_pos, 8);
	        return offset ? new Uint8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
	    };
	    UpdateOp.prototype.lastOwnerTime = function () {
	        var offset = this.bb.__offset(this.bb_pos, 10);
	        return offset ? this.bb.readUint64(this.bb_pos + offset) : this.bb.createLong(0, 0);
	    };
	    UpdateOp.prototype.components = function (index) {
	        var offset = this.bb.__offset(this.bb_pos, 12);
	        return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
	    };
	    UpdateOp.prototype.componentsLength = function () {
	        var offset = this.bb.__offset(this.bb_pos, 12);
	        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
	    };
	    UpdateOp.prototype.componentsArray = function () {
	        var offset = this.bb.__offset(this.bb_pos, 12);
	        return offset ? new Uint8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
	    };
	    UpdateOp.startUpdateOp = function (builder) {
	        builder.startObject(5);
	    };
	    UpdateOp.addNetworkId = function (builder, networkIdOffset) {
	        builder.addFieldOffset(0, networkIdOffset, 0);
	    };
	    UpdateOp.addFullUpdateData = function (builder, fullUpdateDataOffset) {
	        builder.addFieldOffset(1, fullUpdateDataOffset, 0);
	    };
	    UpdateOp.addOwner = function (builder, ownerOffset) {
	        builder.addFieldOffset(2, ownerOffset, 0);
	    };
	    UpdateOp.createOwnerVector = function (builder, data) {
	        builder.startVector(1, data.length, 1);
	        for (var i = data.length - 1; i >= 0; i--) {
	            builder.addInt8(data[i]);
	        }
	        return builder.endVector();
	    };
	    UpdateOp.startOwnerVector = function (builder, numElems) {
	        builder.startVector(1, numElems, 1);
	    };
	    UpdateOp.addLastOwnerTime = function (builder, lastOwnerTime) {
	        builder.addFieldInt64(3, lastOwnerTime, builder.createLong(0, 0));
	    };
	    UpdateOp.addComponents = function (builder, componentsOffset) {
	        builder.addFieldOffset(4, componentsOffset, 0);
	    };
	    UpdateOp.createComponentsVector = function (builder, data) {
	        builder.startVector(1, data.length, 1);
	        for (var i = data.length - 1; i >= 0; i--) {
	            builder.addInt8(data[i]);
	        }
	        return builder.endVector();
	    };
	    UpdateOp.startComponentsVector = function (builder, numElems) {
	        builder.startVector(1, numElems, 1);
	    };
	    UpdateOp.endUpdateOp = function (builder) {
	        var offset = builder.endObject();
	        builder.requiredField(offset, 4); // network_id
	        builder.requiredField(offset, 12); // components
	        return offset;
	    };
	    UpdateOp.prototype.unpack = function () {
	        return new UpdateOpT(this.networkId(), this.fullUpdateData() !== null ? this.fullUpdateData().unpack() : null, this.bb.createScalarList(this.owner.bind(this), this.ownerLength()), this.lastOwnerTime(), this.bb.createScalarList(this.components.bind(this), this.componentsLength()));
	    };
	    UpdateOp.prototype.unpackTo = function (_o) {
	        _o.networkId = this.networkId();
	        _o.fullUpdateData = this.fullUpdateData() !== null ? this.fullUpdateData().unpack() : null;
	        _o.owner = this.bb.createScalarList(this.owner.bind(this), this.ownerLength());
	        _o.lastOwnerTime = this.lastOwnerTime();
	        _o.components = this.bb.createScalarList(this.components.bind(this), this.componentsLength());
	    };
	    return UpdateOp;
	}();
	exports.UpdateOp = UpdateOp;
	var UpdateOpT = /** @class */function () {
	    function UpdateOpT(networkId, fullUpdateData, owner, lastOwnerTime, components) {
	        if (networkId === void 0) {
	            networkId = null;
	        }
	        if (fullUpdateData === void 0) {
	            fullUpdateData = null;
	        }
	        if (owner === void 0) {
	            owner = [];
	        }
	        if (lastOwnerTime === void 0) {
	            lastOwnerTime = flatbuffers.createLong(0, 0);
	        }
	        if (components === void 0) {
	            components = [];
	        }
	        this.networkId = networkId;
	        this.fullUpdateData = fullUpdateData;
	        this.owner = owner;
	        this.lastOwnerTime = lastOwnerTime;
	        this.components = components;
	    }
	    UpdateOpT.prototype.pack = function (builder) {
	        var networkId = this.networkId !== null ? builder.createString(this.networkId) : 0;
	        var fullUpdateData = this.fullUpdateData !== null ? this.fullUpdateData.pack(builder) : 0;
	        var owner = UpdateOp.createOwnerVector(builder, this.owner);
	        var components = UpdateOp.createComponentsVector(builder, this.components);
	        UpdateOp.startUpdateOp(builder);
	        UpdateOp.addNetworkId(builder, networkId);
	        UpdateOp.addFullUpdateData(builder, fullUpdateData);
	        UpdateOp.addOwner(builder, owner);
	        UpdateOp.addLastOwnerTime(builder, this.lastOwnerTime);
	        UpdateOp.addComponents(builder, components);
	        return UpdateOp.endUpdateOp(builder);
	    };
	    return UpdateOpT;
	}();
	exports.UpdateOpT = UpdateOpT;

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/* global AFRAME, NAF, CustomEvent, fetch */

	var _require = __webpack_require__(14),
	    Builder = _require.Builder;

	var _require2 = __webpack_require__(18),
	    messagepackEncode = _require2.encode;

	var _require3 = __webpack_require__(15),
	    ByteBuffer = _require3.ByteBuffer;

	var Y = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"yjs\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()));

	var _require4 = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"y-protocols/awareness\""); e.code = 'MODULE_NOT_FOUND'; throw e; }())),
	    encodeAwarenessUpdate = _require4.encodeAwarenessUpdate,
	    applyAwarenessUpdate = _require4.applyAwarenessUpdate,
	    removeAwarenessStates = _require4.removeAwarenessStates;

	var ReservedDataType = { Update: 'u', Remove: 'r'

	  // Flatbuffers builder
	};var flatbuilder = new Builder(1024);

	var FBMessage = __webpack_require__(21).Message;
	var FBCustomOp = __webpack_require__(23).CustomOp;
	var FBMessageData = __webpack_require__(22).MessageData;
	var FBDocSyncRequest = __webpack_require__(24).DocSyncRequest;
	var FBDocSyncResponse = __webpack_require__(25).DocSyncResponse;
	var FBDocUpdate = __webpack_require__(26).DocUpdate;
	var FBPresenceUpdate = __webpack_require__(27).PresenceUpdate;

	var messageRef = new FBMessage();
	var docSyncRequestRef = new FBDocSyncRequest();
	var docSyncResponseRef = new FBDocSyncResponse();
	var docUpdateRef = new FBDocUpdate();
	var presenceUpdateRef = new FBPresenceUpdate();
	var customRef = new FBCustomOp();

	var _require5 = __webpack_require__(18),
	    messagepackDecode = _require5.decode;

	var NUMBER_OF_SERVER_TIME_REQUESTS = 5;

	var presenceClientIdforNafClientId = function presenceClientIdforNafClientId(presence, nafClientId) {
	  var _iteratorNormalCompletion = true;
	  var _didIteratorError = false;
	  var _iteratorError = undefined;

	  try {
	    for (var _iterator = presence.states.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	      var _step$value = _slicedToArray(_step.value, 2),
	          presenceClientId = _step$value[0],
	          clientId = _step$value[1].client_id;

	      if (clientId === nafClientId) return presenceClientId;
	    }
	  } catch (err) {
	    _didIteratorError = true;
	    _iteratorError = err;
	  } finally {
	    try {
	      if (!_iteratorNormalCompletion && _iterator.return) {
	        _iterator.return();
	      }
	    } finally {
	      if (_didIteratorError) {
	        throw _iteratorError;
	      }
	    }
	  }

	  return null;
	};

	var NetworkConnection = function () {
	  function NetworkConnection(networkEntities) {
	    _classCallCheck(this, NetworkConnection);

	    this.entities = networkEntities;
	    this.dataChannelSubs = {};

	    this.activeDataChannels = {};

	    this._avgTimeOffset = 0;
	    this._serverTimeRequests = 0;
	    this._timeOffsets = [];

	    this._onDocUpdate = this._onDocUpdate.bind(this);
	    this._onPresenceUpdate = this._onPresenceUpdate.bind(this);
	  }

	  _createClass(NetworkConnection, [{
	    key: 'setNetworkAdapter',
	    value: function setNetworkAdapter(adapter) {
	      this.adapter = adapter;
	    }
	  }, {
	    key: 'connect',
	    value: function connect(appName, roomName, doc, presence) {
	      var _this = this;

	      var enableAudio = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

	      NAF.app = appName;
	      NAF.room = roomName;

	      this.doc = doc;
	      this.presence = presence;

	      this.doc.on('update', this._onDocUpdate);
	      this.presence.on('update', this._onPresenceUpdate);

	      this.adapter.setApp(appName);

	      this.adapter.setServerConnectListeners(this.connectSuccess.bind(this), this.connectFailure.bind(this));

	      this.adapter.setDataChannelListeners(this.dataChannelOpen.bind(this), this.dataChannelClosed.bind(this), this.receivedData.bind(this));

	      return this.updateTimeOffset().then(function () {
	        return _this.adapter.connect();
	      }).then(function () {
	        return _this.adapter.joinRoom(roomName);
	      });
	    }
	  }, {
	    key: 'getPresenceStateForClientId',
	    value: function getPresenceStateForClientId(clientId) {
	      if (!this.presence) return null;
	      var presenceId = presenceClientIdforNafClientId(this.presence, clientId);
	      if (!presenceId) return null;

	      return this.presence.states.get(presenceId);
	    }
	  }, {
	    key: 'onConnect',
	    value: function onConnect(callback) {
	      this.onConnectCallback = callback;

	      if (this.isConnected()) {
	        callback();
	      } else {
	        document.body.addEventListener('connected', callback, false);
	      }
	    }
	  }, {
	    key: 'connectSuccess',
	    value: function connectSuccess(clientId) {
	      NAF.log.write('Networked-Aframe Client ID:', clientId);
	      NAF.clientId = clientId;

	      var presence = this.presence;


	      presence.setLocalStateField('client_id', clientId);

	      document.body.dispatchEvent(new CustomEvent('connected', { 'detail': { clientId: clientId, presence: presence } }));
	    }
	  }, {
	    key: 'connectFailure',
	    value: function connectFailure(errorCode, message) {
	      NAF.log.error(errorCode, 'failure to connect');
	    }
	  }, {
	    key: 'getConnectedClients',
	    value: function getConnectedClients() {
	      return this.adapter.getConnectedClients();
	    }
	  }, {
	    key: 'isConnected',
	    value: function isConnected() {
	      return !!NAF.clientId;
	    }
	  }, {
	    key: 'isMineAndConnected',
	    value: function isMineAndConnected(clientId) {
	      return this.isConnected() && NAF.clientId === clientId;
	    }
	  }, {
	    key: 'isNewClient',
	    value: function isNewClient(clientId) {
	      return !this.isConnectedTo(clientId);
	    }
	  }, {
	    key: 'isConnectedTo',
	    value: function isConnectedTo(clientId) {
	      return this.adapter.getConnectStatus(clientId) === NAF.adapters.IS_CONNECTED;
	    }
	  }, {
	    key: 'dataChannelOpen',
	    value: function dataChannelOpen(clientId) {
	      NAF.log.write('Opened data channel from ' + clientId);
	      this.activeDataChannels[clientId] = true;
	      this.entities.completeSync(clientId, true);
	      this.sendDocSyncRequest(clientId);
	      this.sendPresenceUpdate(clientId);

	      document.body.dispatchEvent(new CustomEvent('clientConnected', { detail: { clientId: clientId } }));
	    }
	  }, {
	    key: 'dataChannelClosed',
	    value: function dataChannelClosed(clientId) {
	      NAF.log.write('Closed data channel from ' + clientId);
	      this.activeDataChannels[clientId] = false;
	      this.entities.removeEntitiesOfClient(clientId);

	      var presenceId = presenceClientIdforNafClientId(this.presence, clientId);

	      if (presenceId) {
	        removeAwarenessStates(this.presence, [presenceId], 'disconnect');
	      }

	      var evt = new CustomEvent('clientDisconnected', { detail: { clientId: clientId } });
	      document.body.dispatchEvent(evt);
	    }
	  }, {
	    key: 'hasActiveDataChannel',
	    value: function hasActiveDataChannel(clientId) {
	      return this.activeDataChannels.hasOwnProperty(clientId) && this.activeDataChannels[clientId];
	    }
	  }, {
	    key: 'broadcastData',
	    value: function broadcastData(data) {
	      var guaranteed = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

	      if (guaranteed) {
	        this.adapter.broadcastDataGuaranteed(data);
	      } else {
	        this.adapter.broadcastData(data);
	      }
	    }
	  }, {
	    key: 'broadcastDataGuaranteed',
	    value: function broadcastDataGuaranteed(data) {
	      this.adapter.broadcastDataGuaranteed(data);
	    }
	  }, {
	    key: 'broadcastCustomData',
	    value: function broadcastCustomData(dataType, customData, guaranteed) {
	      this.fillBuilderWithCustomData(dataType, customData);

	      if (guaranteed) {
	        NAF.connection.broadcastDataGuaranteed(flatbuilder.asUint8Array());
	      } else {
	        NAF.connection.broadcastData(flatbuilder.asUint8Array());
	      }
	    }
	  }, {
	    key: 'broadcastCustomDataGuaranteed',
	    value: function broadcastCustomDataGuaranteed(dataType, customData) {
	      this.broadcastCustomData(dataType, customData, true);
	    }
	  }, {
	    key: 'sendData',
	    value: function sendData(data, toClientId) {
	      var guaranteed = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

	      if (this.hasActiveDataChannel(toClientId)) {
	        if (guaranteed) {
	          this.adapter.sendDataGuaranteed(data, toClientId);
	        } else {
	          this.adapter.sendData(data, toClientId);
	        }
	      } else {
	        // console.error("NOT-CONNECTED", "not connected to " + toClient);
	      }
	    }
	  }, {
	    key: 'sendDataGuaranteed',
	    value: function sendDataGuaranteed(data, toClientId) {
	      this.sendData(data, toClientId, true);
	    }
	  }, {
	    key: 'fillBuilderWithCustomData',
	    value: function fillBuilderWithCustomData(dataType, customData) {
	      flatbuilder.clear();

	      var customOffset = FBCustomOp.createCustomOp(flatbuilder, flatbuilder.createSharedString(dataType), FBCustomOp.createPayloadVector(flatbuilder, messagepackEncode(customData)));

	      flatbuilder.finish(FBMessage.createMessage(flatbuilder, FBMessageData.CustomOp, customOffset));
	    }
	  }, {
	    key: 'sendCustomData',
	    value: function sendCustomData(dataType, customData, toClientId) {
	      var guaranteed = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

	      this.fillBuilderWithCustomData(dataType, customData);

	      if (guaranteed) {
	        NAF.connection.sendDataGuaranteed(flatbuilder.asUint8Array(), toClientId);
	      } else {
	        NAF.connection.sendData(flatbuilder.asUint8Array(), toClientId);
	      }
	    }
	  }, {
	    key: 'sendCustomDataGuaranteed',
	    value: function sendCustomDataGuaranteed(dataType, customData, toClientId) {
	      this.sendCustomData(dataType, customData, toClientId, true);
	    }
	  }, {
	    key: 'subscribeToDataChannel',
	    value: function subscribeToDataChannel(dataType, callback) {
	      this.dataChannelSubs[dataType] = callback;
	    }
	  }, {
	    key: 'unsubscribeToDataChannel',
	    value: function unsubscribeToDataChannel(dataType) {
	      delete this.dataChannelSubs[dataType];
	    }
	  }, {
	    key: 'isReservedDataType',
	    value: function isReservedDataType(dataType) {
	      return dataType === ReservedDataType.Update || dataType === ReservedDataType.Remove;
	    }

	    // Returns true if a new entity was created

	  }, {
	    key: 'receivedData',
	    value: function receivedData(data, sender) {
	      var presence = this.presence,
	          doc = this.doc,
	          adapter = this.adapter;


	      FBMessage.getRootAsMessage(new ByteBuffer(data), messageRef);

	      switch (messageRef.dataType()) {
	        case FBMessageData.SceneUpdate:
	          {
	            AFRAME.scenes[0].systems.networked.enqueueIncoming(data, sender);
	            break;
	          }
	        case FBMessageData.PresenceUpdate:
	          {
	            messageRef.data(presenceUpdateRef);
	            applyAwarenessUpdate(presence, presenceUpdateRef.updateArray(), sender);
	            break;
	          }
	        case FBMessageData.DocSyncRequest:
	          {
	            messageRef.data(docSyncRequestRef);
	            var stateVector = docSyncRequestRef.encodedStateVectorArray();
	            var update = Y.encodeStateAsUpdate(doc, stateVector);

	            flatbuilder.clear();
	            flatbuilder.finish(FBMessage.createMessage(flatbuilder, FBMessageData.DocSyncResponse, FBDocSyncResponse.createDocSyncResponse(flatbuilder, FBDocSyncResponse.createUpdateVector(flatbuilder, update))));

	            adapter.sendDataGuaranteed(flatbuilder.asUint8Array(), sender);

	            break;
	          }
	        case FBMessageData.DocSyncResponse:
	          {
	            messageRef.data(docSyncResponseRef);
	            Y.applyUpdate(doc, docSyncResponseRef.updateArray());

	            break;
	          }
	        case FBMessageData.DocUpdate:
	          {
	            messageRef.data(docUpdateRef);
	            Y.applyUpdate(doc, docUpdateRef.updateArray());

	            break;
	          }
	        case FBMessageData.CustomOp:
	          {
	            messageRef.data(customRef);
	            var dataType = customRef.dataType();

	            if (NAF.connection.dataChannelSubs[dataType]) {
	              NAF.connection.dataChannelSubs[dataType](dataType, messagepackDecode(customRef.payloadArray()), sender);
	            }
	            break;
	          }
	      }
	    }
	  }, {
	    key: 'getServerTime',
	    value: function getServerTime() {
	      return Date.now() + this._avgTimeOffset;
	    }
	  }, {
	    key: 'disconnect',
	    value: function disconnect() {
	      this.entities.removeRemoteEntities();
	      this.adapter.disconnect();

	      NAF.app = '';
	      NAF.room = '';
	      NAF.clientId = '';
	      this.activeDataChannels = {};
	      this.adapter = null;
	      this.adapter = null;
	      AFRAME.scenes[0].systems.networked.reset();

	      if (this.doc) {
	        this.doc.off('update', this._onDocUpdate);
	      }

	      if (this.presence) {
	        this.presence.off('update', this._onPresenceUpdate);
	      }

	      document.body.removeEventListener('connected', this.onConnectCallback);
	    }
	  }, {
	    key: 'updateTimeOffset',
	    value: function updateTimeOffset() {
	      var _this2 = this;

	      return new Promise(function (resolve) {
	        var clientSentTime = Date.now();

	        fetch(document.location.href, {
	          method: 'HEAD',
	          cache: 'no-cache'
	        }).then(function (res) {
	          var precision = 1000;
	          var serverReceivedTime = new Date(res.headers.get('Date')).getTime() + precision / 2;
	          var clientReceivedTime = Date.now();
	          var serverTime = serverReceivedTime + (clientReceivedTime - clientSentTime) / 2;
	          var timeOffset = serverTime - clientReceivedTime;

	          _this2._serverTimeRequests++;

	          if (_this2._serverTimeRequests <= NUMBER_OF_SERVER_TIME_REQUESTS) {
	            _this2._timeOffsets.push(timeOffset);
	          } else {
	            _this2._timeOffsets[_this2._serverTimeRequests % 10] = timeOffset;
	          }

	          _this2._avgTimeOffset = Math.floor(_this2._timeOffsets.reduce(function (acc, offset) {
	            return acc += offset;
	          }, 0) / _this2._timeOffsets.length);

	          if (_this2._serverTimeRequests > 10) {
	            setTimeout(function () {
	              return _this2.updateTimeOffset();
	            }, 5 * 60 * 1000); // Sync clock every 5 minutes.
	            _this2._serverTimeRequests = 0;
	            _this2._timeOffsets.length = 0;
	            resolve();
	          } else {
	            _this2.updateTimeOffset().then(resolve);
	          }
	        });
	      });
	    }
	  }, {
	    key: 'sendDocSyncRequest',
	    value: function sendDocSyncRequest(toClientId) {
	      flatbuilder.clear();

	      var encodedStateVector = Y.encodeStateVector(this.doc);

	      flatbuilder.finish(FBMessage.createMessage(flatbuilder, FBMessageData.DocSyncRequest, FBDocSyncRequest.createDocSyncRequest(flatbuilder, FBDocSyncRequest.createEncodedStateVectorVector(flatbuilder, encodedStateVector))));

	      this.adapter.sendDataGuaranteed(flatbuilder.asUint8Array(), toClientId);
	    }
	  }, {
	    key: 'sendPresenceUpdate',
	    value: function sendPresenceUpdate(toClientId) {
	      flatbuilder.clear();

	      flatbuilder.finish(FBMessage.createMessage(flatbuilder, FBMessageData.PresenceUpdate, FBPresenceUpdate.createPresenceUpdate(flatbuilder, FBPresenceUpdate.createUpdateVector(flatbuilder, encodeAwarenessUpdate(this.presence, Array.from(this.presence.getStates().keys()))))));

	      this.adapter.sendDataGuaranteed(flatbuilder.asUint8Array(), toClientId);
	    }
	  }, {
	    key: '_onDocUpdate',
	    value: function _onDocUpdate(update, origin) {
	      if (origin !== this) return;

	      flatbuilder.clear();
	      flatbuilder.finish(FBMessage.createMessage(flatbuilder, FBMessageData.DocUpdate, FBDocUpdate.createDocUpdate(flatbuilder, FBDocUpdate.createUpdateVector(flatbuilder, update))));

	      this.adapter.broadcastDataGuaranteed(flatbuilder.asUint8Array());
	    }
	  }, {
	    key: '_onPresenceUpdate',
	    value: function _onPresenceUpdate(_ref, origin) {
	      var added = _ref.added,
	          updated = _ref.updated,
	          removed = _ref.removed;

	      if (origin !== 'local') return;

	      var presence = this.presence,
	          adapter = this.adapter;


	      var changedClients = added.concat(updated).concat(removed);
	      var update = encodeAwarenessUpdate(presence, changedClients);

	      flatbuilder.clear();
	      flatbuilder.finish(FBMessage.createMessage(flatbuilder, FBMessageData.PresenceUpdate, FBPresenceUpdate.createPresenceUpdate(flatbuilder, FBPresenceUpdate.createUpdateVector(flatbuilder, update))));

	      adapter.broadcastDataGuaranteed(flatbuilder.asUint8Array());
	    }
	  }]);

	  return NetworkConnection;
	}();

	module.exports = NetworkConnection;

/***/ }),
/* 18 */
/***/ (function(module, exports) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	Object.defineProperty(exports, '__esModule', { value: true });

	function typeError(tag, expected) {
	    throw new TypeError('unexpected tag 0x' + tag.toString(16) + ' (' + expected + ' expected)');
	}

	// positive fixint: 0xxx xxxx
	function posFixintTag(i) {
	    return i & 0x7f;
	}
	function isPosFixintTag(tag) {
	    return (tag & 0x80) === 0;
	}
	function readPosFixint(tag) {
	    return tag & 0x7f;
	}
	// negative fixint: 111x xxxx
	function negFixintTag(i) {
	    return 0xe0 | i & 0x1f;
	}
	function isNegFixintTag(tag) {
	    return (tag & 0xe0) == 0xe0;
	}
	function readNegFixint(tag) {
	    return tag - 0x100;
	}
	// fixstr: 101x xxxx
	function fixstrTag(length) {
	    return 0xa0 | length & 0x1f;
	}
	function isFixstrTag(tag) {
	    return (tag & 0xe0) == 0xa0;
	}
	function readFixstr(tag) {
	    return tag & 0x1f;
	}
	// fixarray: 1001 xxxx
	function fixarrayTag(length) {
	    return 0x90 | length & 0x0f;
	}
	function isFixarrayTag(tag) {
	    return (tag & 0xf0) == 0x90;
	}
	function readFixarray(tag) {
	    return tag & 0x0f;
	}
	// fixmap: 1000 xxxx
	function fixmapTag(length) {
	    return 0x80 | length & 0x0f;
	}
	function isFixmapTag(tag) {
	    return (tag & 0xf0) == 0x80;
	}
	function readFixmap(tag) {
	    return tag & 0x0f;
	}

	function createWriteBuffer() {
	    var view = new DataView(new ArrayBuffer(64));
	    var n = 0;
	    function need(x) {
	        if (n + x > view.byteLength) {
	            var arr = new Uint8Array(Math.max(n + x, view.byteLength + 64));
	            arr.set(new Uint8Array(view.buffer.slice(0, n)));
	            view = new DataView(arr.buffer);
	        }
	    }
	    return {
	        put: function put(v) {
	            need(v.byteLength);
	            new Uint8Array(view.buffer).set(new Uint8Array(v), n);
	            n += v.byteLength;
	        },
	        putI8: function putI8(v) {
	            need(1);
	            view.setInt8(n, v);
	            ++n;
	        },
	        putI16: function putI16(v) {
	            need(2);
	            view.setInt16(n, v);
	            n += 2;
	        },
	        putI32: function putI32(v) {
	            need(4);
	            view.setInt32(n, v);
	            n += 4;
	        },
	        putI64: function putI64(v) {
	            need(8);
	            var neg = v < 0;
	            if (neg) {
	                v = -v;
	            }
	            var hi = v / 0x100000000 | 0;
	            var lo = v % 0x100000000 | 0;
	            if (neg) {
	                // 2s complement
	                lo = ~lo + 1 | 0;
	                hi = lo === 0 ? ~hi + 1 | 0 : ~hi;
	            }
	            view.setUint32(n, hi);
	            view.setUint32(n + 4, lo);
	            n += 8;
	        },
	        putUi8: function putUi8(v) {
	            need(1);
	            view.setUint8(n, v);
	            ++n;
	        },
	        putUi16: function putUi16(v) {
	            need(2);
	            view.setUint16(n, v);
	            n += 2;
	        },
	        putUi32: function putUi32(v) {
	            need(4);
	            view.setUint32(n, v);
	            n += 4;
	        },
	        putUi64: function putUi64(v) {
	            need(8);
	            view.setUint32(n, v / 0x100000000 | 0);
	            view.setUint32(n + 4, v % 0x100000000);
	            n += 8;
	        },
	        putF: function putF(v) {
	            need(8);
	            view.setFloat64(n, v);
	            n += 8;
	        },
	        ui8array: function ui8array() {
	            return new Uint8Array(view.buffer.slice(0, n));
	        }
	    };
	}
	function createReadBuffer(buf) {
	    var view = ArrayBuffer.isView(buf) ? new DataView(buf.buffer, buf.byteOffset, buf.byteLength) : new DataView(buf);
	    var n = 0;
	    return {
	        peek: function peek() {
	            return view.getUint8(n);
	        },
	        get: function get(len) {
	            n += len;
	            var off = view.byteOffset;
	            return view.buffer.slice(off + n - len, off + n);
	        },
	        getI8: function getI8() {
	            return view.getInt8(n++);
	        },
	        getI16: function getI16() {
	            n += 2;
	            return view.getInt16(n - 2);
	        },
	        getI32: function getI32() {
	            n += 4;
	            return view.getInt32(n - 4);
	        },
	        getI64: function getI64() {
	            n += 8;
	            var hi = view.getInt32(n - 8);
	            var lo = view.getUint32(n - 4);
	            return hi * 0x100000000 + lo;
	        },
	        getUi8: function getUi8() {
	            return view.getUint8(n++);
	        },
	        getUi16: function getUi16() {
	            n += 2;
	            return view.getUint16(n - 2);
	        },
	        getUi32: function getUi32() {
	            n += 4;
	            return view.getUint32(n - 4);
	        },
	        getUi64: function getUi64() {
	            n += 8;
	            var hi = view.getUint32(n - 8);
	            var lo = view.getUint32(n - 4);
	            return hi * 0x100000000 + lo;
	        },
	        getF32: function getF32() {
	            n += 4;
	            return view.getFloat32(n - 4);
	        },
	        getF64: function getF64() {
	            n += 8;
	            return view.getFloat64(n - 8);
	        }
	    };
	}
	function putBlob(buf, blob, baseTag) {
	    var n = blob.byteLength;
	    if (n <= 255) {
	        buf.putUi8(baseTag);
	        buf.putUi8(n);
	    } else if (n <= 65535) {
	        buf.putUi8(baseTag + 1);
	        buf.putUi16(n);
	    } else if (n <= 4294967295) {
	        buf.putUi8(baseTag + 2);
	        buf.putUi32(n);
	    } else {
	        throw new RangeError("length limit exceeded");
	    }
	    buf.put(blob);
	}
	function getBlob(buf) {
	    var tag = buf.getUi8();
	    var n = void 0;
	    switch (tag) {
	        case 192 /* Nil */:
	            n = 0;
	            break;
	        case 196 /* Bin8 */:
	        case 217 /* Str8 */:
	            n = buf.getUi8();
	            break;
	        case 197 /* Bin16 */:
	        case 218 /* Str16 */:
	            n = buf.getUi16();
	            break;
	        case 198 /* Bin32 */:
	        case 219 /* Str32 */:
	            n = buf.getUi32();
	            break;
	        default:
	            if (!isFixstrTag(tag)) {
	                typeError(tag, "bytes or string");
	            }
	            n = readFixstr(tag);
	    }
	    return buf.get(n);
	}
	function putArrHeader(buf, n) {
	    if (n < 16) {
	        buf.putUi8(fixarrayTag(n));
	    } else {
	        putCollectionHeader(buf, 220 /* Array16 */, n);
	    }
	}
	function getArrHeader(buf, expect) {
	    var tag = buf.getUi8();
	    var n = isFixarrayTag(tag) ? readFixarray(tag) : getCollectionHeader(buf, tag, 220 /* Array16 */, "array");
	    if (expect != null && n !== expect) {
	        throw new Error('invalid array header size ' + n);
	    }
	    return n;
	}
	function putMapHeader(buf, n) {
	    if (n < 16) {
	        buf.putUi8(fixmapTag(n));
	    } else {
	        putCollectionHeader(buf, 222 /* Map16 */, n);
	    }
	}
	function getMapHeader(buf, expect) {
	    var tag = buf.getUi8();
	    var n = isFixmapTag(tag) ? readFixmap(tag) : getCollectionHeader(buf, tag, 222 /* Map16 */, "map");
	    if (expect != null && n !== expect) {
	        throw new Error('invalid map header size ' + n);
	    }
	    return n;
	}
	function putCollectionHeader(buf, baseTag, n) {
	    if (n <= 65535) {
	        buf.putUi8(baseTag);
	        buf.putUi16(n);
	    } else if (n <= 4294967295) {
	        buf.putUi8(baseTag + 1);
	        buf.putUi32(n);
	    } else {
	        throw new RangeError("length limit exceeded");
	    }
	}
	function getCollectionHeader(buf, tag, baseTag, typename) {
	    switch (tag) {
	        case 192 /* Nil */:
	            return 0;
	        case baseTag:
	            // 16 bit
	            return buf.getUi16();
	        case baseTag + 1:
	            // 32 bit
	            return buf.getUi32();
	        default:
	            typeError(tag, typename);
	    }
	}

	var Any = {
	    enc: function enc(buf, v) {
	        typeOf(v).enc(buf, v);
	    },
	    dec: function dec(buf) {
	        return tagType(buf.peek()).dec(buf);
	    }
	};
	var Nil = {
	    enc: function enc(buf, v) {
	        buf.putUi8(192 /* Nil */);
	    },
	    dec: function dec(buf) {
	        var tag = buf.getUi8();
	        if (tag !== 192 /* Nil */) {
	                typeError(tag, "nil");
	            }
	        return null;
	    }
	};
	var Bool = {
	    enc: function enc(buf, v) {
	        buf.putUi8(v ? 195 /* True */ : 194 /* False */);
	    },
	    dec: function dec(buf) {
	        var tag = buf.getUi8();
	        switch (tag) {
	            case 192 /* Nil */:
	            case 194 /* False */:
	                return false;
	            case 195 /* True */:
	                return true;
	            default:
	                typeError(tag, "bool");
	        }
	    }
	};
	var Int = {
	    enc: function enc(buf, v) {
	        if (-128 <= v && v <= 127) {
	            if (v >= 0) {
	                buf.putUi8(posFixintTag(v));
	            } else if (v > -32) {
	                buf.putUi8(negFixintTag(v));
	            } else {
	                buf.putUi8(208 /* Int8 */);
	                buf.putUi8(v);
	            }
	        } else if (-32768 <= v && v <= 32767) {
	            buf.putI8(209 /* Int16 */);
	            buf.putI16(v);
	        } else if (-2147483648 <= v && v <= 2147483647) {
	            buf.putI8(210 /* Int32 */);
	            buf.putI32(v);
	        } else {
	            buf.putI8(211 /* Int64 */);
	            buf.putI64(v);
	        }
	    },
	    dec: function dec(buf) {
	        var tag = buf.getUi8();
	        if (isPosFixintTag(tag)) {
	            return readPosFixint(tag);
	        } else if (isNegFixintTag(tag)) {
	            return readNegFixint(tag);
	        }
	        switch (tag) {
	            case 192 /* Nil */:
	                return 0;
	            // signed int types
	            case 208 /* Int8 */:
	                return buf.getI8();
	            case 209 /* Int16 */:
	                return buf.getI16();
	            case 210 /* Int32 */:
	                return buf.getI32();
	            case 211 /* Int64 */:
	                return buf.getI64();
	            // unsigned int types
	            case 204 /* Uint8 */:
	                return buf.getUi8();
	            case 205 /* Uint16 */:
	                return buf.getUi16();
	            case 206 /* Uint32 */:
	                return buf.getUi32();
	            case 207 /* Uint64 */:
	                return buf.getUi64();
	            default:
	                typeError(tag, "int");
	        }
	    }
	};
	var Uint = {
	    enc: function enc(buf, v) {
	        if (v < 0) {
	            throw new Error('not an uint: ' + v);
	        } else if (v <= 127) {
	            buf.putUi8(posFixintTag(v));
	        } else if (v <= 255) {
	            buf.putUi8(204 /* Uint8 */);
	            buf.putUi8(v);
	        } else if (v <= 65535) {
	            buf.putUi8(205 /* Uint16 */);
	            buf.putUi16(v);
	        } else if (v <= 4294967295) {
	            buf.putUi8(206 /* Uint32 */);
	            buf.putUi32(v);
	        } else {
	            buf.putUi8(207 /* Uint64 */);
	            buf.putUi64(v);
	        }
	    },
	    dec: function dec(buf) {
	        var v = Int.dec(buf);
	        if (v < 0) {
	            throw new RangeError("uint underflow");
	        }
	        return v;
	    }
	};
	var Float = {
	    enc: function enc(buf, v) {
	        buf.putUi8(203 /* Float64 */);
	        buf.putF(v);
	    },
	    dec: function dec(buf) {
	        var tag = buf.getUi8();
	        switch (tag) {
	            case 192 /* Nil */:
	                return 0;
	            case 202 /* Float32 */:
	                return buf.getF32();
	            case 203 /* Float64 */:
	                return buf.getF64();
	            default:
	                typeError(tag, "float");
	        }
	    }
	};
	var Bytes = {
	    enc: function enc(buf, v) {
	        putBlob(buf, v, 196 /* Bin8 */);
	    },

	    dec: getBlob
	};
	var Str = {
	    enc: function enc(buf, v) {
	        var utf8 = toUTF8(v);
	        if (utf8.byteLength < 32) {
	            buf.putUi8(fixstrTag(utf8.byteLength));
	            buf.put(utf8);
	        } else {
	            putBlob(buf, utf8, 217 /* Str8 */);
	        }
	    },
	    dec: function dec(buf) {
	        return fromUTF8(getBlob(buf));
	    }
	};
	var Time = {
	    enc: function enc(buf, v) {
	        var ms = v.getTime();
	        buf.putUi8(199 /* Ext8 */);
	        buf.putUi8(12);
	        buf.putI8(-1);
	        buf.putUi32(ms % 1000 * 1000000);
	        buf.putI64(ms / 1000);
	    },
	    dec: function dec(buf) {
	        var tag = buf.getUi8();
	        switch (tag) {
	            case 214 /* FixExt4 */:
	                // 32-bit seconds
	                if (buf.getI8() === -1) {
	                    return new Date(buf.getUi32() * 1000);
	                }
	                break;
	            case 215 /* FixExt8 */:
	                // 34-bit seconds + 30-bit nanoseconds
	                if (buf.getI8() === -1) {
	                    var lo = buf.getUi32();
	                    var hi = buf.getUi32();
	                    // seconds: hi + (lo&0x3)*0x100000000
	                    // nanoseconds: lo>>2 == lo/4
	                    return new Date((hi + (lo & 0x3) * 0x100000000) * 1000 + lo / 4000000);
	                }
	                break;
	            case 199 /* Ext8 */:
	                // 64-bit seconds + 32-bit nanoseconds
	                if (buf.getUi8() === 12 && buf.getI8() === -1) {
	                    var ns = buf.getUi32();
	                    var s = buf.getI64();
	                    return new Date(s * 1000 + ns / 1000000);
	                }
	                break;
	        }
	        typeError(tag, "time");
	    }
	};
	var Arr = TypedArr(Any);
	var Map = TypedMap(Any, Any);
	function TypedArr(valueT) {
	    return {
	        encHeader: putArrHeader,
	        decHeader: getArrHeader,
	        enc: function enc(buf, v) {
	            putArrHeader(buf, v.length);
	            v.forEach(function (x) {
	                return valueT.enc(buf, x);
	            });
	        },
	        dec: function dec(buf) {
	            var res = [];
	            for (var n = getArrHeader(buf); n > 0; --n) {
	                res.push(valueT.dec(buf));
	            }
	            return res;
	        }
	    };
	}
	function TypedMap(keyT, valueT) {
	    return {
	        encHeader: putMapHeader,
	        decHeader: getMapHeader,
	        enc: function enc(buf, v) {
	            var props = Object.keys(v);
	            putMapHeader(buf, props.length);
	            props.forEach(function (p) {
	                keyT.enc(buf, p);
	                valueT.enc(buf, v[p]);
	            });
	        },
	        dec: function dec(buf) {
	            var res = {};
	            for (var n = getMapHeader(buf); n > 0; --n) {
	                var k = keyT.dec(buf);
	                res[k] = valueT.dec(buf);
	            }
	            return res;
	        }
	    };
	}
	function structEncoder(fields) {
	    var ordinals = Object.keys(fields);
	    return function (buf, v) {
	        putMapHeader(buf, ordinals.length);
	        ordinals.forEach(function (ord) {
	            var f = fields[ord];
	            Int.enc(buf, Number(ord));
	            f[1].enc(buf, v[f[0]]);
	        });
	    };
	}
	function structDecoder(fields) {
	    return function (buf) {
	        var res = {};
	        for (var n = getMapHeader(buf); n > 0; --n) {
	            var f = fields[Int.dec(buf)];
	            if (f) {
	                res[f[0]] = f[1].dec(buf);
	            } else {
	                Any.dec(buf);
	            }
	        }
	        return res;
	    };
	}
	function Struct(fields) {
	    return {
	        enc: structEncoder(fields),
	        dec: structDecoder(fields)
	    };
	}
	function unionEncoder(branches) {
	    return function (buf, v) {
	        putArrHeader(buf, 2);
	        var ord = branches.ordinalOf(v);
	        Int.enc(buf, ord);
	        branches[ord].enc(buf, v);
	    };
	}
	function unionDecoder(branches) {
	    return function (buf) {
	        getArrHeader(buf, 2);
	        var t = branches[Int.dec(buf)];
	        if (!t) {
	            throw new TypeError("invalid union type");
	        }
	        return t.dec(buf);
	    };
	}
	function Union(branches) {
	    return {
	        enc: unionEncoder(branches),
	        dec: unionDecoder(branches)
	    };
	}
	function toUTF8(v) {
	    var n = v.length;
	    var bin = new Uint8Array(4 * n);
	    var pos = 0,
	        i = 0,
	        c = void 0;
	    while (i < n) {
	        c = v.charCodeAt(i++);
	        if ((c & 0xfc00) === 0xd800) {
	            c = (c << 10) + v.charCodeAt(i++) - 0x35fdc00;
	        }
	        if (c < 0x80) {
	            bin[pos++] = c;
	        } else if (c < 0x800) {
	            bin[pos++] = 0xc0 + (c >> 6);
	            bin[pos++] = 0x80 + (c & 0x3f);
	        } else if (c < 0x10000) {
	            bin[pos++] = 0xe0 + (c >> 12);
	            bin[pos++] = 0x80 + (c >> 6 & 0x3f);
	            bin[pos++] = 0x80 + (c & 0x3f);
	        } else {
	            bin[pos++] = 0xf0 + (c >> 18);
	            bin[pos++] = 0x80 + (c >> 12 & 0x3f);
	            bin[pos++] = 0x80 + (c >> 6 & 0x3f);
	            bin[pos++] = 0x80 + (c & 0x3f);
	        }
	    }
	    return bin.buffer.slice(0, pos);
	}
	function fromUTF8(buf) {
	    return new TextDecoder("utf-8").decode(buf);
	}
	function typeOf(v) {
	    switch (typeof v === 'undefined' ? 'undefined' : _typeof(v)) {
	        case "undefined":
	            return Nil;
	        case "boolean":
	            return Bool;
	        case "number":
	            return !isFinite(v) || Math.floor(v) !== v ? Float : v < 0 ? Int : Uint;
	        case "string":
	            return Str;
	        case "object":
	            return v === null ? Nil : Array.isArray(v) ? Arr : v instanceof Uint8Array || v instanceof ArrayBuffer ? Bytes : v instanceof Date ? Time : Map;
	        default:
	            throw new TypeError('unsupported type ' + (typeof v === 'undefined' ? 'undefined' : _typeof(v)));
	    }
	}
	function tagType(tag) {
	    switch (tag) {
	        case 192 /* Nil */:
	            return Nil;
	        case 194 /* False */:
	        case 195 /* True */:
	            return Bool;
	        case 208 /* Int8 */:
	        case 209 /* Int16 */:
	        case 210 /* Int32 */:
	        case 211 /* Int64 */:
	            return Int;
	        case 204 /* Uint8 */:
	        case 205 /* Uint16 */:
	        case 206 /* Uint32 */:
	        case 207 /* Uint64 */:
	            return Uint;
	        case 202 /* Float32 */:
	        case 203 /* Float64 */:
	            return Float;
	        case 196 /* Bin8 */:
	        case 197 /* Bin16 */:
	        case 198 /* Bin32 */:
	            return Bytes;
	        case 217 /* Str8 */:
	        case 218 /* Str16 */:
	        case 219 /* Str32 */:
	            return Str;
	        case 220 /* Array16 */:
	        case 221 /* Array32 */:
	            return Arr;
	        case 222 /* Map16 */:
	        case 223 /* Map32 */:
	            return Map;
	        case 214 /* FixExt4 */:
	        case 215 /* FixExt8 */:
	        case 199 /* Ext8 */:
	            return Time;
	        default:
	            if (isPosFixintTag(tag) || isNegFixintTag(tag)) {
	                return Int;
	            }
	            if (isFixstrTag(tag)) {
	                return Str;
	            }
	            if (isFixarrayTag(tag)) {
	                return Arr;
	            }
	            if (isFixmapTag(tag)) {
	                return Map;
	            }
	            throw new TypeError('unsupported tag ' + tag);
	    }
	}

	function encode(v, typ) {
	    var buf = createWriteBuffer();
	    (typ || Any).enc(buf, v);
	    return buf.ui8array();
	}
	function decode(buf, typ) {
	    return (typ || Any).dec(createReadBuffer(buf));
	}

	exports.Any = Any;
	exports.Arr = Arr;
	exports.Bool = Bool;
	exports.Bytes = Bytes;
	exports.Float = Float;
	exports.Int = Int;
	exports.Map = Map;
	exports.Nil = Nil;
	exports.Str = Str;
	exports.Struct = Struct;
	exports.Time = Time;
	exports.TypedArr = TypedArr;
	exports.TypedMap = TypedMap;
	exports.Uint = Uint;
	exports.Union = Union;
	exports.decode = decode;
	exports.encode = encode;
	exports.structDecoder = structDecoder;
	exports.structEncoder = structEncoder;
	exports.unionDecoder = unionDecoder;
	exports.unionEncoder = unionEncoder;
	//# sourceMappingURL=messagepack.cjs.js.map

/***/ }),
/* 19 */,
/* 20 */,
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.MessageT = exports.Message = void 0;
	var flatbuffers = __webpack_require__(9);
	var message_data_1 = __webpack_require__(22);
	var Message = /** @class */function () {
	    function Message() {
	        this.bb = null;
	        this.bb_pos = 0;
	    }
	    Message.prototype.__init = function (i, bb) {
	        this.bb_pos = i;
	        this.bb = bb;
	        return this;
	    };
	    Message.getRootAsMessage = function (bb, obj) {
	        return (obj || new Message()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    Message.getSizePrefixedRootAsMessage = function (bb, obj) {
	        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
	        return (obj || new Message()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    Message.prototype.dataType = function () {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.readUint8(this.bb_pos + offset) : message_data_1.MessageData.NONE;
	    };
	    Message.prototype.data = function (obj) {
	        var offset = this.bb.__offset(this.bb_pos, 6);
	        return offset ? this.bb.__union(obj, this.bb_pos + offset) : null;
	    };
	    Message.startMessage = function (builder) {
	        builder.startObject(2);
	    };
	    Message.addDataType = function (builder, dataType) {
	        builder.addFieldInt8(0, dataType, message_data_1.MessageData.NONE);
	    };
	    Message.addData = function (builder, dataOffset) {
	        builder.addFieldOffset(1, dataOffset, 0);
	    };
	    Message.endMessage = function (builder) {
	        var offset = builder.endObject();
	        builder.requiredField(offset, 6); // data
	        return offset;
	    };
	    Message.finishMessageBuffer = function (builder, offset) {
	        builder.finish(offset);
	    };
	    Message.finishSizePrefixedMessageBuffer = function (builder, offset) {
	        builder.finish(offset, undefined, true);
	    };
	    Message.createMessage = function (builder, dataType, dataOffset) {
	        Message.startMessage(builder);
	        Message.addDataType(builder, dataType);
	        Message.addData(builder, dataOffset);
	        return Message.endMessage(builder);
	    };
	    Message.prototype.unpack = function () {
	        var _this = this;
	        return new MessageT(this.dataType(), function () {
	            var temp = (0, message_data_1.unionToMessageData)(_this.dataType(), _this.data.bind(_this));
	            if (temp === null) {
	                return null;
	            }
	            return temp.unpack();
	        }());
	    };
	    Message.prototype.unpackTo = function (_o) {
	        var _this = this;
	        _o.dataType = this.dataType();
	        _o.data = function () {
	            var temp = (0, message_data_1.unionToMessageData)(_this.dataType(), _this.data.bind(_this));
	            if (temp === null) {
	                return null;
	            }
	            return temp.unpack();
	        }();
	    };
	    return Message;
	}();
	exports.Message = Message;
	var MessageT = /** @class */function () {
	    function MessageT(dataType, data) {
	        if (dataType === void 0) {
	            dataType = message_data_1.MessageData.NONE;
	        }
	        if (data === void 0) {
	            data = null;
	        }
	        this.dataType = dataType;
	        this.data = data;
	    }
	    MessageT.prototype.pack = function (builder) {
	        var data = builder.createObjectOffset(this.data);
	        return Message.createMessage(builder, this.dataType, data);
	    };
	    return MessageT;
	}();
	exports.MessageT = MessageT;

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.unionListToMessageData = exports.unionToMessageData = exports.MessageData = void 0;
	var custom_op_1 = __webpack_require__(23);
	var doc_sync_request_1 = __webpack_require__(24);
	var doc_sync_response_1 = __webpack_require__(25);
	var doc_update_1 = __webpack_require__(26);
	var presence_update_1 = __webpack_require__(27);
	var scene_update_1 = __webpack_require__(28);
	var MessageData;
	(function (MessageData) {
	    MessageData[MessageData["NONE"] = 0] = "NONE";
	    MessageData[MessageData["SceneUpdate"] = 1] = "SceneUpdate";
	    MessageData[MessageData["CustomOp"] = 2] = "CustomOp";
	    MessageData[MessageData["DocSyncRequest"] = 3] = "DocSyncRequest";
	    MessageData[MessageData["DocSyncResponse"] = 4] = "DocSyncResponse";
	    MessageData[MessageData["DocUpdate"] = 5] = "DocUpdate";
	    MessageData[MessageData["PresenceUpdate"] = 6] = "PresenceUpdate";
	})(MessageData = exports.MessageData || (exports.MessageData = {}));
	function unionToMessageData(type, accessor) {
	    switch (MessageData[type]) {
	        case 'NONE':
	            return null;
	        case 'SceneUpdate':
	            return accessor(new scene_update_1.SceneUpdate());
	        case 'CustomOp':
	            return accessor(new custom_op_1.CustomOp());
	        case 'DocSyncRequest':
	            return accessor(new doc_sync_request_1.DocSyncRequest());
	        case 'DocSyncResponse':
	            return accessor(new doc_sync_response_1.DocSyncResponse());
	        case 'DocUpdate':
	            return accessor(new doc_update_1.DocUpdate());
	        case 'PresenceUpdate':
	            return accessor(new presence_update_1.PresenceUpdate());
	        default:
	            return null;
	    }
	}
	exports.unionToMessageData = unionToMessageData;
	function unionListToMessageData(type, accessor, index) {
	    switch (MessageData[type]) {
	        case 'NONE':
	            return null;
	        case 'SceneUpdate':
	            return accessor(index, new scene_update_1.SceneUpdate());
	        case 'CustomOp':
	            return accessor(index, new custom_op_1.CustomOp());
	        case 'DocSyncRequest':
	            return accessor(index, new doc_sync_request_1.DocSyncRequest());
	        case 'DocSyncResponse':
	            return accessor(index, new doc_sync_response_1.DocSyncResponse());
	        case 'DocUpdate':
	            return accessor(index, new doc_update_1.DocUpdate());
	        case 'PresenceUpdate':
	            return accessor(index, new presence_update_1.PresenceUpdate());
	        default:
	            return null;
	    }
	}
	exports.unionListToMessageData = unionListToMessageData;

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.CustomOpT = exports.CustomOp = void 0;
	var flatbuffers = __webpack_require__(9);
	var CustomOp = /** @class */function () {
	    function CustomOp() {
	        this.bb = null;
	        this.bb_pos = 0;
	    }
	    CustomOp.prototype.__init = function (i, bb) {
	        this.bb_pos = i;
	        this.bb = bb;
	        return this;
	    };
	    CustomOp.getRootAsCustomOp = function (bb, obj) {
	        return (obj || new CustomOp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    CustomOp.getSizePrefixedRootAsCustomOp = function (bb, obj) {
	        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
	        return (obj || new CustomOp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    CustomOp.prototype.dataType = function (optionalEncoding) {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
	    };
	    CustomOp.prototype.payload = function (index) {
	        var offset = this.bb.__offset(this.bb_pos, 6);
	        return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
	    };
	    CustomOp.prototype.payloadLength = function () {
	        var offset = this.bb.__offset(this.bb_pos, 6);
	        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
	    };
	    CustomOp.prototype.payloadArray = function () {
	        var offset = this.bb.__offset(this.bb_pos, 6);
	        return offset ? new Uint8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
	    };
	    CustomOp.startCustomOp = function (builder) {
	        builder.startObject(2);
	    };
	    CustomOp.addDataType = function (builder, dataTypeOffset) {
	        builder.addFieldOffset(0, dataTypeOffset, 0);
	    };
	    CustomOp.addPayload = function (builder, payloadOffset) {
	        builder.addFieldOffset(1, payloadOffset, 0);
	    };
	    CustomOp.createPayloadVector = function (builder, data) {
	        builder.startVector(1, data.length, 1);
	        for (var i = data.length - 1; i >= 0; i--) {
	            builder.addInt8(data[i]);
	        }
	        return builder.endVector();
	    };
	    CustomOp.startPayloadVector = function (builder, numElems) {
	        builder.startVector(1, numElems, 1);
	    };
	    CustomOp.endCustomOp = function (builder) {
	        var offset = builder.endObject();
	        builder.requiredField(offset, 4); // data_type
	        builder.requiredField(offset, 6); // payload
	        return offset;
	    };
	    CustomOp.createCustomOp = function (builder, dataTypeOffset, payloadOffset) {
	        CustomOp.startCustomOp(builder);
	        CustomOp.addDataType(builder, dataTypeOffset);
	        CustomOp.addPayload(builder, payloadOffset);
	        return CustomOp.endCustomOp(builder);
	    };
	    CustomOp.prototype.unpack = function () {
	        return new CustomOpT(this.dataType(), this.bb.createScalarList(this.payload.bind(this), this.payloadLength()));
	    };
	    CustomOp.prototype.unpackTo = function (_o) {
	        _o.dataType = this.dataType();
	        _o.payload = this.bb.createScalarList(this.payload.bind(this), this.payloadLength());
	    };
	    return CustomOp;
	}();
	exports.CustomOp = CustomOp;
	var CustomOpT = /** @class */function () {
	    function CustomOpT(dataType, payload) {
	        if (dataType === void 0) {
	            dataType = null;
	        }
	        if (payload === void 0) {
	            payload = [];
	        }
	        this.dataType = dataType;
	        this.payload = payload;
	    }
	    CustomOpT.prototype.pack = function (builder) {
	        var dataType = this.dataType !== null ? builder.createString(this.dataType) : 0;
	        var payload = CustomOp.createPayloadVector(builder, this.payload);
	        return CustomOp.createCustomOp(builder, dataType, payload);
	    };
	    return CustomOpT;
	}();
	exports.CustomOpT = CustomOpT;

/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.DocSyncRequestT = exports.DocSyncRequest = void 0;
	var flatbuffers = __webpack_require__(9);
	var DocSyncRequest = /** @class */function () {
	    function DocSyncRequest() {
	        this.bb = null;
	        this.bb_pos = 0;
	    }
	    DocSyncRequest.prototype.__init = function (i, bb) {
	        this.bb_pos = i;
	        this.bb = bb;
	        return this;
	    };
	    DocSyncRequest.getRootAsDocSyncRequest = function (bb, obj) {
	        return (obj || new DocSyncRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    DocSyncRequest.getSizePrefixedRootAsDocSyncRequest = function (bb, obj) {
	        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
	        return (obj || new DocSyncRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    DocSyncRequest.prototype.encodedStateVector = function (index) {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
	    };
	    DocSyncRequest.prototype.encodedStateVectorLength = function () {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
	    };
	    DocSyncRequest.prototype.encodedStateVectorArray = function () {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? new Uint8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
	    };
	    DocSyncRequest.startDocSyncRequest = function (builder) {
	        builder.startObject(1);
	    };
	    DocSyncRequest.addEncodedStateVector = function (builder, encodedStateVectorOffset) {
	        builder.addFieldOffset(0, encodedStateVectorOffset, 0);
	    };
	    DocSyncRequest.createEncodedStateVectorVector = function (builder, data) {
	        builder.startVector(1, data.length, 1);
	        for (var i = data.length - 1; i >= 0; i--) {
	            builder.addInt8(data[i]);
	        }
	        return builder.endVector();
	    };
	    DocSyncRequest.startEncodedStateVectorVector = function (builder, numElems) {
	        builder.startVector(1, numElems, 1);
	    };
	    DocSyncRequest.endDocSyncRequest = function (builder) {
	        var offset = builder.endObject();
	        return offset;
	    };
	    DocSyncRequest.createDocSyncRequest = function (builder, encodedStateVectorOffset) {
	        DocSyncRequest.startDocSyncRequest(builder);
	        DocSyncRequest.addEncodedStateVector(builder, encodedStateVectorOffset);
	        return DocSyncRequest.endDocSyncRequest(builder);
	    };
	    DocSyncRequest.prototype.unpack = function () {
	        return new DocSyncRequestT(this.bb.createScalarList(this.encodedStateVector.bind(this), this.encodedStateVectorLength()));
	    };
	    DocSyncRequest.prototype.unpackTo = function (_o) {
	        _o.encodedStateVector = this.bb.createScalarList(this.encodedStateVector.bind(this), this.encodedStateVectorLength());
	    };
	    return DocSyncRequest;
	}();
	exports.DocSyncRequest = DocSyncRequest;
	var DocSyncRequestT = /** @class */function () {
	    function DocSyncRequestT(encodedStateVector) {
	        if (encodedStateVector === void 0) {
	            encodedStateVector = [];
	        }
	        this.encodedStateVector = encodedStateVector;
	    }
	    DocSyncRequestT.prototype.pack = function (builder) {
	        var encodedStateVector = DocSyncRequest.createEncodedStateVectorVector(builder, this.encodedStateVector);
	        return DocSyncRequest.createDocSyncRequest(builder, encodedStateVector);
	    };
	    return DocSyncRequestT;
	}();
	exports.DocSyncRequestT = DocSyncRequestT;

/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.DocSyncResponseT = exports.DocSyncResponse = void 0;
	var flatbuffers = __webpack_require__(9);
	var DocSyncResponse = /** @class */function () {
	    function DocSyncResponse() {
	        this.bb = null;
	        this.bb_pos = 0;
	    }
	    DocSyncResponse.prototype.__init = function (i, bb) {
	        this.bb_pos = i;
	        this.bb = bb;
	        return this;
	    };
	    DocSyncResponse.getRootAsDocSyncResponse = function (bb, obj) {
	        return (obj || new DocSyncResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    DocSyncResponse.getSizePrefixedRootAsDocSyncResponse = function (bb, obj) {
	        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
	        return (obj || new DocSyncResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    DocSyncResponse.prototype.update = function (index) {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
	    };
	    DocSyncResponse.prototype.updateLength = function () {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
	    };
	    DocSyncResponse.prototype.updateArray = function () {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? new Uint8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
	    };
	    DocSyncResponse.startDocSyncResponse = function (builder) {
	        builder.startObject(1);
	    };
	    DocSyncResponse.addUpdate = function (builder, updateOffset) {
	        builder.addFieldOffset(0, updateOffset, 0);
	    };
	    DocSyncResponse.createUpdateVector = function (builder, data) {
	        builder.startVector(1, data.length, 1);
	        for (var i = data.length - 1; i >= 0; i--) {
	            builder.addInt8(data[i]);
	        }
	        return builder.endVector();
	    };
	    DocSyncResponse.startUpdateVector = function (builder, numElems) {
	        builder.startVector(1, numElems, 1);
	    };
	    DocSyncResponse.endDocSyncResponse = function (builder) {
	        var offset = builder.endObject();
	        return offset;
	    };
	    DocSyncResponse.createDocSyncResponse = function (builder, updateOffset) {
	        DocSyncResponse.startDocSyncResponse(builder);
	        DocSyncResponse.addUpdate(builder, updateOffset);
	        return DocSyncResponse.endDocSyncResponse(builder);
	    };
	    DocSyncResponse.prototype.unpack = function () {
	        return new DocSyncResponseT(this.bb.createScalarList(this.update.bind(this), this.updateLength()));
	    };
	    DocSyncResponse.prototype.unpackTo = function (_o) {
	        _o.update = this.bb.createScalarList(this.update.bind(this), this.updateLength());
	    };
	    return DocSyncResponse;
	}();
	exports.DocSyncResponse = DocSyncResponse;
	var DocSyncResponseT = /** @class */function () {
	    function DocSyncResponseT(update) {
	        if (update === void 0) {
	            update = [];
	        }
	        this.update = update;
	    }
	    DocSyncResponseT.prototype.pack = function (builder) {
	        var update = DocSyncResponse.createUpdateVector(builder, this.update);
	        return DocSyncResponse.createDocSyncResponse(builder, update);
	    };
	    return DocSyncResponseT;
	}();
	exports.DocSyncResponseT = DocSyncResponseT;

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.DocUpdateT = exports.DocUpdate = void 0;
	var flatbuffers = __webpack_require__(9);
	var DocUpdate = /** @class */function () {
	    function DocUpdate() {
	        this.bb = null;
	        this.bb_pos = 0;
	    }
	    DocUpdate.prototype.__init = function (i, bb) {
	        this.bb_pos = i;
	        this.bb = bb;
	        return this;
	    };
	    DocUpdate.getRootAsDocUpdate = function (bb, obj) {
	        return (obj || new DocUpdate()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    DocUpdate.getSizePrefixedRootAsDocUpdate = function (bb, obj) {
	        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
	        return (obj || new DocUpdate()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    DocUpdate.prototype.update = function (index) {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
	    };
	    DocUpdate.prototype.updateLength = function () {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
	    };
	    DocUpdate.prototype.updateArray = function () {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? new Uint8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
	    };
	    DocUpdate.startDocUpdate = function (builder) {
	        builder.startObject(1);
	    };
	    DocUpdate.addUpdate = function (builder, updateOffset) {
	        builder.addFieldOffset(0, updateOffset, 0);
	    };
	    DocUpdate.createUpdateVector = function (builder, data) {
	        builder.startVector(1, data.length, 1);
	        for (var i = data.length - 1; i >= 0; i--) {
	            builder.addInt8(data[i]);
	        }
	        return builder.endVector();
	    };
	    DocUpdate.startUpdateVector = function (builder, numElems) {
	        builder.startVector(1, numElems, 1);
	    };
	    DocUpdate.endDocUpdate = function (builder) {
	        var offset = builder.endObject();
	        return offset;
	    };
	    DocUpdate.createDocUpdate = function (builder, updateOffset) {
	        DocUpdate.startDocUpdate(builder);
	        DocUpdate.addUpdate(builder, updateOffset);
	        return DocUpdate.endDocUpdate(builder);
	    };
	    DocUpdate.prototype.unpack = function () {
	        return new DocUpdateT(this.bb.createScalarList(this.update.bind(this), this.updateLength()));
	    };
	    DocUpdate.prototype.unpackTo = function (_o) {
	        _o.update = this.bb.createScalarList(this.update.bind(this), this.updateLength());
	    };
	    return DocUpdate;
	}();
	exports.DocUpdate = DocUpdate;
	var DocUpdateT = /** @class */function () {
	    function DocUpdateT(update) {
	        if (update === void 0) {
	            update = [];
	        }
	        this.update = update;
	    }
	    DocUpdateT.prototype.pack = function (builder) {
	        var update = DocUpdate.createUpdateVector(builder, this.update);
	        return DocUpdate.createDocUpdate(builder, update);
	    };
	    return DocUpdateT;
	}();
	exports.DocUpdateT = DocUpdateT;

/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.PresenceUpdateT = exports.PresenceUpdate = void 0;
	var flatbuffers = __webpack_require__(9);
	var PresenceUpdate = /** @class */function () {
	    function PresenceUpdate() {
	        this.bb = null;
	        this.bb_pos = 0;
	    }
	    PresenceUpdate.prototype.__init = function (i, bb) {
	        this.bb_pos = i;
	        this.bb = bb;
	        return this;
	    };
	    PresenceUpdate.getRootAsPresenceUpdate = function (bb, obj) {
	        return (obj || new PresenceUpdate()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    PresenceUpdate.getSizePrefixedRootAsPresenceUpdate = function (bb, obj) {
	        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
	        return (obj || new PresenceUpdate()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    PresenceUpdate.prototype.update = function (index) {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
	    };
	    PresenceUpdate.prototype.updateLength = function () {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
	    };
	    PresenceUpdate.prototype.updateArray = function () {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? new Uint8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
	    };
	    PresenceUpdate.startPresenceUpdate = function (builder) {
	        builder.startObject(1);
	    };
	    PresenceUpdate.addUpdate = function (builder, updateOffset) {
	        builder.addFieldOffset(0, updateOffset, 0);
	    };
	    PresenceUpdate.createUpdateVector = function (builder, data) {
	        builder.startVector(1, data.length, 1);
	        for (var i = data.length - 1; i >= 0; i--) {
	            builder.addInt8(data[i]);
	        }
	        return builder.endVector();
	    };
	    PresenceUpdate.startUpdateVector = function (builder, numElems) {
	        builder.startVector(1, numElems, 1);
	    };
	    PresenceUpdate.endPresenceUpdate = function (builder) {
	        var offset = builder.endObject();
	        return offset;
	    };
	    PresenceUpdate.createPresenceUpdate = function (builder, updateOffset) {
	        PresenceUpdate.startPresenceUpdate(builder);
	        PresenceUpdate.addUpdate(builder, updateOffset);
	        return PresenceUpdate.endPresenceUpdate(builder);
	    };
	    PresenceUpdate.prototype.unpack = function () {
	        return new PresenceUpdateT(this.bb.createScalarList(this.update.bind(this), this.updateLength()));
	    };
	    PresenceUpdate.prototype.unpackTo = function (_o) {
	        _o.update = this.bb.createScalarList(this.update.bind(this), this.updateLength());
	    };
	    return PresenceUpdate;
	}();
	exports.PresenceUpdate = PresenceUpdate;
	var PresenceUpdateT = /** @class */function () {
	    function PresenceUpdateT(update) {
	        if (update === void 0) {
	            update = [];
	        }
	        this.update = update;
	    }
	    PresenceUpdateT.prototype.pack = function (builder) {
	        var update = PresenceUpdate.createUpdateVector(builder, this.update);
	        return PresenceUpdate.createPresenceUpdate(builder, update);
	    };
	    return PresenceUpdateT;
	}();
	exports.PresenceUpdateT = PresenceUpdateT;

/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.SceneUpdateT = exports.SceneUpdate = void 0;
	var flatbuffers = __webpack_require__(9);
	var delete_op_1 = __webpack_require__(29);
	var update_op_1 = __webpack_require__(16);
	var SceneUpdate = /** @class */function () {
	    function SceneUpdate() {
	        this.bb = null;
	        this.bb_pos = 0;
	    }
	    SceneUpdate.prototype.__init = function (i, bb) {
	        this.bb_pos = i;
	        this.bb = bb;
	        return this;
	    };
	    SceneUpdate.getRootAsSceneUpdate = function (bb, obj) {
	        return (obj || new SceneUpdate()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    SceneUpdate.getSizePrefixedRootAsSceneUpdate = function (bb, obj) {
	        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
	        return (obj || new SceneUpdate()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    SceneUpdate.prototype.updates = function (index, obj) {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? (obj || new update_op_1.UpdateOp()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
	    };
	    SceneUpdate.prototype.updatesLength = function () {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
	    };
	    SceneUpdate.prototype.deletes = function (index, obj) {
	        var offset = this.bb.__offset(this.bb_pos, 6);
	        return offset ? (obj || new delete_op_1.DeleteOp()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
	    };
	    SceneUpdate.prototype.deletesLength = function () {
	        var offset = this.bb.__offset(this.bb_pos, 6);
	        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
	    };
	    SceneUpdate.startSceneUpdate = function (builder) {
	        builder.startObject(2);
	    };
	    SceneUpdate.addUpdates = function (builder, updatesOffset) {
	        builder.addFieldOffset(0, updatesOffset, 0);
	    };
	    SceneUpdate.createUpdatesVector = function (builder, data) {
	        builder.startVector(4, data.length, 4);
	        for (var i = data.length - 1; i >= 0; i--) {
	            builder.addOffset(data[i]);
	        }
	        return builder.endVector();
	    };
	    SceneUpdate.startUpdatesVector = function (builder, numElems) {
	        builder.startVector(4, numElems, 4);
	    };
	    SceneUpdate.addDeletes = function (builder, deletesOffset) {
	        builder.addFieldOffset(1, deletesOffset, 0);
	    };
	    SceneUpdate.createDeletesVector = function (builder, data) {
	        builder.startVector(4, data.length, 4);
	        for (var i = data.length - 1; i >= 0; i--) {
	            builder.addOffset(data[i]);
	        }
	        return builder.endVector();
	    };
	    SceneUpdate.startDeletesVector = function (builder, numElems) {
	        builder.startVector(4, numElems, 4);
	    };
	    SceneUpdate.endSceneUpdate = function (builder) {
	        var offset = builder.endObject();
	        return offset;
	    };
	    SceneUpdate.createSceneUpdate = function (builder, updatesOffset, deletesOffset) {
	        SceneUpdate.startSceneUpdate(builder);
	        SceneUpdate.addUpdates(builder, updatesOffset);
	        SceneUpdate.addDeletes(builder, deletesOffset);
	        return SceneUpdate.endSceneUpdate(builder);
	    };
	    SceneUpdate.prototype.unpack = function () {
	        return new SceneUpdateT(this.bb.createObjList(this.updates.bind(this), this.updatesLength()), this.bb.createObjList(this.deletes.bind(this), this.deletesLength()));
	    };
	    SceneUpdate.prototype.unpackTo = function (_o) {
	        _o.updates = this.bb.createObjList(this.updates.bind(this), this.updatesLength());
	        _o.deletes = this.bb.createObjList(this.deletes.bind(this), this.deletesLength());
	    };
	    return SceneUpdate;
	}();
	exports.SceneUpdate = SceneUpdate;
	var SceneUpdateT = /** @class */function () {
	    function SceneUpdateT(updates, deletes) {
	        if (updates === void 0) {
	            updates = [];
	        }
	        if (deletes === void 0) {
	            deletes = [];
	        }
	        this.updates = updates;
	        this.deletes = deletes;
	    }
	    SceneUpdateT.prototype.pack = function (builder) {
	        var updates = SceneUpdate.createUpdatesVector(builder, builder.createObjectOffsetList(this.updates));
	        var deletes = SceneUpdate.createDeletesVector(builder, builder.createObjectOffsetList(this.deletes));
	        return SceneUpdate.createSceneUpdate(builder, updates, deletes);
	    };
	    return SceneUpdateT;
	}();
	exports.SceneUpdateT = SceneUpdateT;

/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.DeleteOpT = exports.DeleteOp = void 0;
	var flatbuffers = __webpack_require__(9);
	var DeleteOp = /** @class */function () {
	    function DeleteOp() {
	        this.bb = null;
	        this.bb_pos = 0;
	    }
	    DeleteOp.prototype.__init = function (i, bb) {
	        this.bb_pos = i;
	        this.bb = bb;
	        return this;
	    };
	    DeleteOp.getRootAsDeleteOp = function (bb, obj) {
	        return (obj || new DeleteOp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    DeleteOp.getSizePrefixedRootAsDeleteOp = function (bb, obj) {
	        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
	        return (obj || new DeleteOp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
	    };
	    DeleteOp.prototype.networkId = function (optionalEncoding) {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
	    };
	    DeleteOp.startDeleteOp = function (builder) {
	        builder.startObject(1);
	    };
	    DeleteOp.addNetworkId = function (builder, networkIdOffset) {
	        builder.addFieldOffset(0, networkIdOffset, 0);
	    };
	    DeleteOp.endDeleteOp = function (builder) {
	        var offset = builder.endObject();
	        builder.requiredField(offset, 4); // network_id
	        return offset;
	    };
	    DeleteOp.createDeleteOp = function (builder, networkIdOffset) {
	        DeleteOp.startDeleteOp(builder);
	        DeleteOp.addNetworkId(builder, networkIdOffset);
	        return DeleteOp.endDeleteOp(builder);
	    };
	    DeleteOp.prototype.unpack = function () {
	        return new DeleteOpT(this.networkId());
	    };
	    DeleteOp.prototype.unpackTo = function (_o) {
	        _o.networkId = this.networkId();
	    };
	    return DeleteOp;
	}();
	exports.DeleteOp = DeleteOp;
	var DeleteOpT = /** @class */function () {
	    function DeleteOpT(networkId) {
	        if (networkId === void 0) {
	            networkId = null;
	        }
	        this.networkId = networkId;
	    }
	    DeleteOpT.prototype.pack = function (builder) {
	        var networkId = this.networkId !== null ? builder.createString(this.networkId) : 0;
	        return DeleteOp.createDeleteOp(builder, networkId);
	    };
	    return DeleteOpT;
	}();
	exports.DeleteOpT = DeleteOpT;

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var P2PCFAdapter = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"./P2PCFAdapter\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()));

	var AdapterFactory = function () {
	  function AdapterFactory() {
	    _classCallCheck(this, AdapterFactory);

	    this.adapters = { p2pcf: P2PCFAdapter };
	    this.IS_CONNECTED = AdapterFactory.IS_CONNECTED;
	    this.CONNECTING = AdapterFactory.CONNECTING;
	    this.NOT_CONNECTED = AdapterFactory.NOT_CONNECTED;
	  }

	  _createClass(AdapterFactory, [{
	    key: 'register',
	    value: function register(adapterName, AdapterClass) {
	      this.adapters[adapterName] = AdapterClass;
	    }
	  }, {
	    key: 'make',
	    value: function make(adapterName) {
	      var name = adapterName.toLowerCase();
	      if (this.adapters[name]) {
	        var AdapterClass = this.adapters[name];
	        return new AdapterClass();
	      } else {
	        throw new Error('Adapter: ' + adapterName + ' not registered. Please use NAF.adapters.register() to register this adapter.');
	      }
	    }
	  }]);

	  return AdapterFactory;
	}();

	AdapterFactory.IS_CONNECTED = 'IS_CONNECTED';
	AdapterFactory.CONNECTING = 'CONNECTING';
	AdapterFactory.NOT_CONNECTED = 'NOT_CONNECTED';

	module.exports = AdapterFactory;

/***/ }),
/* 31 */,
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	/* global AFRAME, NAF */

	var Y = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"yjs\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()));

	var _require = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"y-protocols/awareness\""); e.code = 'MODULE_NOT_FOUND'; throw e; }())),
	    Awareness = _require.Awareness;

	AFRAME.registerComponent('networked-scene', {
	  schema: {
	    app: { default: 'default' },
	    room: { default: 'default' },
	    connectOnLoad: { default: true },
	    onConnect: { default: 'onConnect' },
	    adapter: { default: 'wsEasyRtc' }, // See https://github.com/networked-aframe/networked-aframe#adapters for list of adapters
	    audio: { default: false }, // Only if adapter supports audio
	    debug: { default: false }
	  },

	  init: function init() {
	    var el = this.el;
	    this.connect = this.connect.bind(this);
	    el.addEventListener('connect', this.connect);
	    if (this.data.connectOnLoad) {
	      el.emit('connect', null, false);
	    }
	  },

	  /**
	   * Connect to signalling server and begin connecting to other clients
	   */
	  connect: function connect() {
	    NAF.log.setDebug(this.data.debug);
	    NAF.log.write('Networked-Aframe Connecting...');

	    this.doc = new Y.Doc();
	    this.presence = new Awareness(this.doc);
	    this.checkDeprecatedProperties();
	    this.setupNetworkAdapter();

	    if (this.hasOnConnectFunction()) {
	      this.callOnConnect();
	    }

	    return NAF.connection.connect(this.data.app, this.data.room, this.doc, this.presence, this.data.audio);
	  },

	  checkDeprecatedProperties: function checkDeprecatedProperties() {
	    // No current
	  },

	  setupNetworkAdapter: function setupNetworkAdapter() {
	    var adapterName = this.data.adapter;
	    var adapter = NAF.adapters.make(adapterName);
	    var dataNetworkAdapter = NAF.adapters.make('p2pcf');
	    NAF.connection.setNetworkAdapter(adapter, dataNetworkAdapter);
	    this.el.emit('adapter-ready', adapter, false);
	  },

	  hasOnConnectFunction: function hasOnConnectFunction() {
	    return this.data.onConnect !== '' && window.hasOwnProperty(this.data.onConnect);
	  },

	  callOnConnect: function callOnConnect() {
	    NAF.connection.onConnect(window[this.data.onConnect]);
	  },

	  remove: function remove() {
	    NAF.log.write('networked-scene disconnected');
	    this.el.removeEventListener('connect', this.connect);
	    NAF.connection.disconnect();
	  }
	});

/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	/* global AFRAME, NAF, THREE, performance, CustomEvent */
	var flexbuffers = __webpack_require__(34);

	var _require = __webpack_require__(42),
	    Reference = _require.Reference;

	var _require2 = __webpack_require__(15),
	    ByteBuffer = _require2.ByteBuffer;

	var _require3 = __webpack_require__(14),
	    Builder = _require3.Builder;

	var _require4 = __webpack_require__(12),
	    Long = _require4.Long;

	var _require5 = __webpack_require__(37),
	    fromByteWidth = _require5.fromByteWidth;

	var _require6 = __webpack_require__(44),
	    refCp = _require6.refCp,
	    refGetNumeric = _require6.refGetNumeric,
	    refGetInt = _require6.refGetInt,
	    refGetToObject = _require6.refGetToObject,
	    refAdvanceToIndexGet = _require6.refAdvanceToIndexGet;

	var deepEqual = __webpack_require__(45);
	var DEG2RAD = THREE.Math.DEG2RAD;
	var OBJECT3D_COMPONENTS = ['position', 'rotation', 'scale'];

	var _require7 = __webpack_require__(46),
	    Lerper = _require7.Lerper,
	    TYPE_POSITION = _require7.TYPE_POSITION,
	    TYPE_QUATERNION = _require7.TYPE_QUATERNION,
	    TYPE_SCALE = _require7.TYPE_SCALE;

	var _require8 = __webpack_require__(3),
	    hexToBytes = _require8.hexToBytes,
	    bytesToHex = _require8.bytesToHex;

	var tmpPosition = new THREE.Vector3();
	var tmpQuaternion = new THREE.Quaternion();

	var FBMessage = __webpack_require__(21).Message;
	var FBMessageData = __webpack_require__(22).MessageData;
	var FBSceneUpdate = __webpack_require__(28).SceneUpdate;
	var FBFullUpdateData = __webpack_require__(8).FullUpdateData;
	var FBUpdateOp = __webpack_require__(16).UpdateOp;
	var FBDeleteOp = __webpack_require__(29).DeleteOp;
	// const FBCustomOp = require('../schema/networked-aframe/custom-op').CustomOp

	var clientIdByteBuf = [];
	var opOffsetBuf = [];
	var messageRef = new FBMessage();
	var fullUpdateDataRef = new FBFullUpdateData();
	var sceneUpdateRef = new FBSceneUpdate();
	var updateRef = new FBUpdateOp();
	var deleteRef = new FBDeleteOp();
	var tmpLong = new Long(0, 0);

	var MAX_AWAIT_INSTANTIATION_MS = 10000;

	var tmpRef = new flexbuffers.toReference(new ArrayBuffer(4)); // eslint-disable-line

	// Flatbuffers builder
	var flatbuilder = new Builder(1024);

	// Flexbuffer builder
	var flexbuilder = new flexbuffers.builder(); // eslint-disable-line

	var tmpTargetClientIds = new Set();

	// Don't dedup because we want to re-use builder
	flexbuilder.dedupStrings = false;
	flexbuilder.dedupKeys = false;
	flexbuilder.dedupKeyVectors = false;

	var flexbuilderUintView = new Uint8Array(flexbuilder.buffer);
	var resetFlexBuilder = function resetFlexBuilder() {
	  flexbuilderUintView.fill(0);
	  flexbuilder.stack.length = 0;
	  flexbuilder.stackPointers.length = 0;
	  flexbuilder.offset = 0;
	  flexbuilder.finished = false;
	};

	// Map of aframe component name -> sorted attribute list
	var aframeSchemaSortedKeys = new Map();

	function defaultRequiresUpdate() {
	  var cachedData = null;

	  return function (newData) {
	    // Initial call here should just cache existing value since this is for delta chacking
	    // after the initial full syncs.
	    if (cachedData === null && newData !== null) {
	      cachedData = AFRAME.utils.clone(newData);
	      return false;
	    }

	    if (cachedData === null && newData !== null || !deepEqual(cachedData, newData)) {
	      cachedData = AFRAME.utils.clone(newData);
	      return true;
	    }

	    return false;
	  };
	}

	AFRAME.registerSystem('networked', {
	  init: function init() {
	    var _this = this;

	    // An array of "networked" component instances.
	    this.components = [];

	    this.reset();

	    var running = false;

	    // Main networking loop, doesn't run on RAF
	    setInterval(function () {
	      if (running || !NAF.connection.adapter) return;

	      running = true;
	      var now = performance.now();

	      try {
	        if (now < _this.nextSyncTime) return;

	        var _iteratorNormalCompletion = true;
	        var _didIteratorError = false;
	        var _iteratorError = undefined;

	        try {
	          for (var _iterator = _this.components[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	            var component = _step.value;

	            component.consumeFirstUpdateIfNecessary();
	          }
	        } catch (err) {
	          _didIteratorError = true;
	          _iteratorError = err;
	        } finally {
	          try {
	            if (!_iteratorNormalCompletion && _iterator.return) {
	              _iterator.return();
	            }
	          } finally {
	            if (_didIteratorError) {
	              throw _iteratorError;
	            }
	          }
	        }

	        if (!_this.incomingPaused) _this.performReceiveStep();
	        _this.performSendStep();
	      } finally {
	        running = false;
	      }
	    }, 1000.0 / 60.0); // 60hz outer loop
	  },
	  register: function register(component) {
	    this.components.push(component);
	    this.instantiatingNetworkIds.delete(component.data.networkId);
	  },
	  deregister: function deregister(component) {
	    var idx = this.components.indexOf(component);

	    if (idx > -1) {
	      this.components.splice(idx, 1);
	    }
	  },
	  enqueueIncoming: function enqueueIncoming(data, sender) {
	    this.incomingData.push(data);
	    this.incomingSenders.push(sender);
	  },
	  reset: function reset() {
	    // Incoming messages and flag to determine if incoming message processing should pause
	    this.incomingData = [];
	    this.incomingSenders = [];
	    this.incomingPaused = false;

	    // Set of network ids that had a full sync but have not yet shown up in the set of
	    // entities. This avoids processing any messages until it has been instantiated.
	    this.instantiatingNetworkIds = new Map();
	    this.awaitingPeers = new Map();

	    this.nextSyncTime = 0;
	  },
	  performReceiveStep: function performReceiveStep() {
	    var incomingData = this.incomingData,
	        incomingSenders = this.incomingSenders;


	    outer: // eslint-disable-line
	    for (var i = 0, l = incomingData.length; i < l; i++) {
	      var data = incomingData.shift();
	      var sender = incomingSenders.shift();

	      FBMessage.getRootAsMessage(new ByteBuffer(data), messageRef);
	      messageRef.data(sceneUpdateRef);

	      var now = performance.now();

	      // Do a pass over the updates first to determine if this message should be skipped + requeued
	      for (var _i = 0, _l = sceneUpdateRef.updatesLength(); _i < _l; _i++) {
	        sceneUpdateRef.updates(_i, updateRef);

	        var networkId = updateRef.networkId();
	        var hasInstantiatedEntity = NAF.entities.hasEntity(networkId);
	        var isFullSync = updateRef.fullUpdateData(fullUpdateDataRef) != null;

	        if (!hasInstantiatedEntity) {
	          // If rtc peer is not connected yet for a first sync, requeue for MAX_AWAIT_INSTANTIATION_MS.
	          if (!NAF.connection.activeDataChannels[sender]) {
	            if (!this.awaitingPeers.has(sender) || now - this.awaitingPeers.get(sender) < MAX_AWAIT_INSTANTIATION_MS) {
	              if (!this.awaitingPeers.has(sender)) {
	                this.awaitingPeers.set(sender, performance.now());
	              }

	              incomingData.push(data);
	              incomingSenders.push(sender);
	            }

	            continue outer; // eslint-disable-line
	          }

	          // Possibly re-queue messages for missing entities, or owners still getting webrtc peer set up
	          // For persistent missing entities, requeue all messages since scene creates it.
	          if (isFullSync && fullUpdateDataRef.persistent()) {
	            incomingData.push(data);
	            incomingSenders.push(sender);
	            continue outer; // eslint-disable-line
	          } else {
	            // Let through the first full sync for a new, non-persistent entity
	            var isFirstFullSync = isFullSync && !this.instantiatingNetworkIds.has(networkId);

	            if (isFirstFullSync) {
	              // If rtc peer is not connected yet for a first sync, requeue for MAX_AWAIT_INSTANTIATION_MS.
	              // Mark entity as instantiating and process it so we don't consume subsequent first syncs.
	              this.awaitingPeers.delete(sender);
	              this.instantiatingNetworkIds.set(networkId, performance.now());
	            } else {
	              // Otherwise re-queue or skip if instantiation never showed up after delay.
	              //
	              // If delay has been met, we just stop re-enqueuing. Instantiation probably failed.
	              if (!this.instantiatingNetworkIds.has(networkId) || now - this.instantiatingNetworkIds.get(networkId) < MAX_AWAIT_INSTANTIATION_MS) {
	                incomingData.push(data);
	                incomingSenders.push(sender);
	              }

	              continue outer; // eslint-disable-line
	            }
	          }
	        }
	      }

	      for (var _i2 = 0, _l2 = sceneUpdateRef.updatesLength(); _i2 < _l2; _i2++) {
	        sceneUpdateRef.updates(_i2, updateRef);
	        NAF.entities.updateEntity(updateRef, sender);
	      }

	      for (var _i3 = 0, _l3 = sceneUpdateRef.deletesLength(); _i3 < _l3; _i3++) {
	        sceneUpdateRef.deletes(_i3, deleteRef);
	        NAF.entities.removeRemoteEntity(deleteRef, sender);
	      }
	    }
	  },
	  performSendStep: function performSendStep() {
	    var send = false;
	    var sendGuaranteed = false;

	    // Target client ids for direct full syncs or will have null if a broadcast
	    // of a normal update is needed.
	    tmpTargetClientIds.clear();

	    for (var i = 0, l = this.components.length; i < l; i++) {
	      var c = this.components[i];

	      if (!c.isMine()) continue;
	      if (!c.canSync()) continue;
	      if (!c.el.parentElement) {
	        NAF.log.error('entity registered with system despite being removed');
	        // TODO: Find out why tick is still being called
	        continue;
	      }

	      var isFull = false;

	      if (c.pendingFullSyncTargetClients.size > 0) {
	        isFull = true;

	        var _iteratorNormalCompletion2 = true;
	        var _didIteratorError2 = false;
	        var _iteratorError2 = undefined;

	        try {
	          for (var _iterator2 = c.pendingFullSyncTargetClients[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
	            var clientId = _step2.value;

	            tmpTargetClientIds.add(clientId);
	          }
	        } catch (err) {
	          _didIteratorError2 = true;
	          _iteratorError2 = err;
	        } finally {
	          try {
	            if (!_iteratorNormalCompletion2 && _iterator2.return) {
	              _iterator2.return();
	            }
	          } finally {
	            if (_didIteratorError2) {
	              throw _iteratorError2;
	            }
	          }
	        }

	        c.pendingFullSyncTargetClients.clear();
	      }

	      resetFlexBuilder();

	      if (!c.pushComponentsDataToFlexBuilder(isFull)) continue;

	      if (!send) {
	        flatbuilder.clear();
	        opOffsetBuf.length = 0;
	        send = true;
	      }

	      var componentsOffset = FBUpdateOp.createComponentsVector(flatbuilder, new Uint8Array(flexbuilder.finish()));
	      var ownerOffset = FBUpdateOp.createOwnerVector(flatbuilder, hexToBytes(c.data.owner, clientIdByteBuf));

	      var fullUpdateDataOffset = null;

	      if (isFull) {
	        sendGuaranteed = true;

	        fullUpdateDataOffset = FBFullUpdateData.createFullUpdateData(flatbuilder, FBFullUpdateData.createCreatorVector(flatbuilder, hexToBytes(c.data.creator, clientIdByteBuf)), flatbuilder.createSharedString(c.data.template), c.data.persistent, flatbuilder.createSharedString(c.getParentId()));
	      } else {
	        // Add null client id to ensure a broadcast of partial updates
	        tmpTargetClientIds.add(null);
	      }

	      var networkIdOffset = flatbuilder.createSharedString(c.data.networkId);
	      FBUpdateOp.startUpdateOp(flatbuilder);
	      FBUpdateOp.addNetworkId(flatbuilder, networkIdOffset);
	      FBUpdateOp.addOwner(flatbuilder, ownerOffset);
	      tmpLong.low = c.lastOwnerTime & 0x3fffffff;
	      tmpLong.high = (c.lastOwnerTime - tmpLong.low) / 0x40000000;
	      FBUpdateOp.addLastOwnerTime(flatbuilder, tmpLong);
	      FBUpdateOp.addComponents(flatbuilder, componentsOffset);

	      if (fullUpdateDataOffset !== null) {
	        FBUpdateOp.addFullUpdateData(flatbuilder, fullUpdateDataOffset);
	      }

	      opOffsetBuf.push(FBUpdateOp.endUpdateOp(flatbuilder));
	    }

	    if (send) {
	      var updatesOffset = FBSceneUpdate.createUpdatesVector(flatbuilder, opOffsetBuf);
	      FBSceneUpdate.startSceneUpdate(flatbuilder);
	      FBSceneUpdate.addUpdates(flatbuilder, updatesOffset);
	      var sceneUpdateOffset = FBSceneUpdate.endSceneUpdate(flatbuilder);

	      flatbuilder.finish(FBMessage.createMessage(flatbuilder, FBMessageData.SceneUpdate, sceneUpdateOffset));

	      if (tmpTargetClientIds.has(null)) {
	        NAF.connection.broadcastData(flatbuilder.asUint8Array(), sendGuaranteed);
	      } else {
	        var _iteratorNormalCompletion3 = true;
	        var _didIteratorError3 = false;
	        var _iteratorError3 = undefined;

	        try {
	          for (var _iterator3 = tmpTargetClientIds[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
	            var _clientId = _step3.value;

	            NAF.connection.sendData(flatbuilder.asUint8Array(), _clientId, sendGuaranteed);
	          }
	        } catch (err) {
	          _didIteratorError3 = true;
	          _iteratorError3 = err;
	        } finally {
	          try {
	            if (!_iteratorNormalCompletion3 && _iterator3.return) {
	              _iterator3.return();
	            }
	          } finally {
	            if (_didIteratorError3) {
	              throw _iteratorError3;
	            }
	          }
	        }
	      }
	    }

	    this.updateNextSyncTime();
	  },
	  updateNextSyncTime: function updateNextSyncTime() {
	    this.nextSyncTime = performance.now() + 1000.0 / NAF.options.updateRate;
	  }
	});

	AFRAME.registerComponent('networked', {
	  schema: {
	    template: { default: '' },
	    attachTemplateToLocal: { default: true },
	    persistent: { default: false },

	    networkId: { default: '' },
	    owner: { default: '' },
	    creator: { default: '' }
	  },

	  init: function init() {
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
	    this.conversionEuler.order = 'YXZ';
	    this.lerpers = [];
	    this.pendingFullSyncTargetClients = new Set();
	    this.lastErrorLoggedAt = 0;
	    this.pendingConsumeFirstUpdate = false;

	    var wasCreatedByNetwork = this.wasCreatedByNetwork();

	    this.onConnected = this.onConnected.bind(this);

	    this.componentSchemas = NAF.schemas.getComponents(this.data.template);
	    this.cachedElements = new Array(this.componentSchemas.length);

	    // Maintain a bit that determines if a component has ever been synced out.
	    // In cases where we add a component after-the-fact, without this bit we will
	    // skip the initial update.
	    this.sentFirstComponentSyncs = this.componentSchemas.map(function () {
	      return false;
	    });

	    this.networkUpdatePredicates = this.componentSchemas.map(function (x) {
	      return x.requiresNetworkUpdate && x.requiresNetworkUpdate() || defaultRequiresUpdate();
	    });

	    // Fill cachedElements array with null elements
	    this.invalidateCachedElements();

	    this.initNetworkParent();

	    var networkId = void 0;

	    if (this.data.networkId === '') {
	      networkId = NAF.utils.createNetworkId();
	      this.el.setAttribute(this.name, { networkId: networkId });
	    } else {
	      networkId = this.data.networkId;
	    }

	    if (!this.el.id) {
	      this.el.setAttribute('id', 'naf-' + networkId);
	    }

	    if (wasCreatedByNetwork) {
	      this.pendingConsumeFirstUpdate = true;
	    } else {
	      if (this.data.attachTemplateToLocal) {
	        this.attachTemplateToLocal();
	      }
	    }

	    NAF.entities.registerEntity(networkId, this.el);

	    this.lastOwnerTime = 1;

	    if (NAF.clientId) {
	      this.onConnected();
	    } else {
	      document.body.addEventListener('connected', this.onConnected, false);
	    }

	    document.body.dispatchEvent(this.entityCreatedEvent());
	    this.el.dispatchEvent(new CustomEvent('instantiated', { detail: { el: this.el } }));
	    this.el.sceneEl.systems.networked.register(this);
	  },

	  attachTemplateToLocal: function attachTemplateToLocal() {
	    var template = NAF.schemas.getCachedTemplate(this.data.template);
	    var elAttrs = template.attributes;

	    // Merge root element attributes with this entity
	    for (var attrIdx = 0; attrIdx < elAttrs.length; attrIdx++) {
	      this.el.setAttribute(elAttrs[attrIdx].name, elAttrs[attrIdx].value);
	    }

	    // Append all child elements
	    while (template.firstElementChild) {
	      this.el.appendChild(template.firstElementChild);
	    }
	  },

	  takeOwnership: function takeOwnership() {
	    var owner = this.data.owner;
	    var lastOwnerTime = this.lastOwnerTime;
	    var now = NAF.connection.getServerTime();
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

	  wasCreatedByNetwork: function wasCreatedByNetwork() {
	    return !!this.el.firstUpdateRef;
	  },

	  initNetworkParent: function initNetworkParent() {
	    var parentEl = this.el.parentElement;
	    if (parentEl.hasOwnProperty('components') && parentEl.components.hasOwnProperty('networked')) {
	      this.parent = parentEl;
	    } else {
	      this.parent = null;
	    }
	  },

	  consumeFirstUpdateIfNecessary: function consumeFirstUpdateIfNecessary() {
	    if (!this.pendingConsumeFirstUpdate) return;
	    this.networkUpdate(this.el.firstUpdateRef, this.data.creator);
	    this.pendingConsumeFirstUpdate = false;
	  },

	  onConnected: function onConnected() {
	    var _this2 = this;

	    this.positionNormalizer = NAF.entities.positionNormalizer;
	    this.positionDenormalizer = NAF.entities.positionDenormalizer;

	    if (this.data.owner === '') {
	      this.lastOwnerTime = NAF.connection.getServerTime();
	      this.el.setAttribute(this.name, { owner: NAF.clientId, creator: NAF.clientId });
	      this.el.object3D.matrixNeedsUpdate = true;
	      setTimeout(function () {
	        // a-primitives attach their components on the next frame; wait for components to be attached before calling syncAll
	        if (!_this2.el.parentNode) {
	          NAF.log.warn('Networked element was removed before ever getting the chance to syncAll');
	          return;
	        }
	        _this2.syncAll();
	      }, 0);
	    }

	    document.body.removeEventListener('connected', this.onConnected, false);
	  },

	  isMine: function isMine() {
	    return this.data.owner === NAF.clientId;
	  },

	  createdByMe: function createdByMe() {
	    return this.data.creator === NAF.clientId;
	  },

	  tick: function tick(time, dt) {
	    if (!this.isMine()) {
	      for (var i = 0; i < this.lerpers.length; i++) {
	        var _lerpers$i = this.lerpers[i],
	            lerper = _lerpers$i.lerper,
	            object3D = _lerpers$i.object3D;


	        var pos = tmpPosition;
	        pos.copy(object3D.position);

	        var positionUpdated = lerper.step(TYPE_POSITION, pos);

	        if (positionUpdated) {
	          if (this.positionDenormalizer) {
	            pos = this.positionDenormalizer(pos, object3D.position);
	          }

	          object3D.position.copy(pos);
	        }

	        var quaternionUpdated = lerper.step(TYPE_QUATERNION, object3D.quaternion);
	        var scaleUpdated = lerper.step(TYPE_SCALE, object3D.scale);

	        if (positionUpdated || quaternionUpdated || scaleUpdated) {
	          object3D.matrixNeedsUpdate = true;
	        }
	      }
	    }
	  },

	  /* Sending updates */

	  syncAll: function syncAll() {
	    var targetClientId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

	    if (!this.canSync()) return;
	    this.pendingFullSyncTargetClients.add(targetClientId);
	  },

	  getCachedElement: function getCachedElement(componentSchemaIndex) {
	    var cachedElement = this.cachedElements[componentSchemaIndex];

	    if (cachedElement) {
	      return cachedElement;
	    }

	    var componentSchema = this.componentSchemas[componentSchemaIndex];

	    if (componentSchema.selector) {
	      var el = this.el.querySelector(componentSchema.selector);
	      this.cachedElements[componentSchemaIndex] = el;
	      return el;
	    } else {
	      this.cachedElements[componentSchemaIndex] = this.el;
	      return this.el;
	    }
	  },
	  invalidateCachedElements: function invalidateCachedElements() {
	    for (var i = 0; i < this.cachedElements.length; i++) {
	      this.cachedElements[i] = null;
	    }
	  },


	  pushComponentsDataToFlexBuilder: function pushComponentsDataToFlexBuilder(fullSync) {
	    var hadComponents = false;

	    for (var i = 0; i < this.componentSchemas.length; i++) {
	      var componentSchema = this.componentSchemas[i];
	      var componentElement = this.getCachedElement(i);

	      if (!componentElement) continue;

	      var componentName = componentSchema.component ? componentSchema.component : componentSchema;
	      var componentData = componentElement.getAttribute(componentName);

	      if (componentData === null) continue;

	      var syncedComponentData = componentSchema.property ? componentData[componentSchema.property] : componentData;

	      // Use networkUpdatePredicate to check if the component needs to be updated.
	      // Call networkUpdatePredicate first so that it can update any cached values in the event of a fullSync.
	      if (!this.sentFirstComponentSyncs[i] || this.networkUpdatePredicates[i](syncedComponentData) || fullSync) {
	        // Components preamble
	        if (!hadComponents) {
	          flexbuilder.startVector();
	        }

	        var dataToSync = syncedComponentData;

	        if (this.positionNormalizer && componentName === 'position') {
	          dataToSync = this.positionNormalizer(dataToSync, this.el);
	        }

	        if (dataToSync !== null) {
	          this.sentFirstComponentSyncs[i] = true;
	          hadComponents = true;

	          flexbuilder.startVector();
	          flexbuilder.addInt(i);

	          if (OBJECT3D_COMPONENTS.includes(componentName)) {
	            flexbuilder.addFloat(Math.fround(dataToSync.x));
	            flexbuilder.addFloat(Math.fround(dataToSync.y));
	            flexbuilder.addFloat(Math.fround(dataToSync.z));
	          } else {
	            if ((typeof dataToSync === 'undefined' ? 'undefined' : _typeof(dataToSync)) === 'object') {
	              if (dataToSync.isVector2) {
	                flexbuilder.addInt(0);
	                flexbuilder.addFloat(Math.fround(dataToSync.x));
	                flexbuilder.addFloat(Math.fround(dataToSync.y));
	              } else if (dataToSync.isVector3) {
	                flexbuilder.addInt(1);
	                flexbuilder.addFloat(Math.fround(dataToSync.x));
	                flexbuilder.addFloat(Math.fround(dataToSync.y));
	                flexbuilder.addFloat(Math.fround(dataToSync.z));
	              } else if (dataToSync.isQuaternion) {
	                flexbuilder.addInt(2);
	                flexbuilder.addFloat(Math.fround(dataToSync.x));
	                flexbuilder.addFloat(Math.fround(dataToSync.y));
	                flexbuilder.addFloat(Math.fround(dataToSync.z));
	                flexbuilder.addFloat(Math.fround(dataToSync.w));
	              } else {
	                flexbuilder.addInt(3);

	                if (!aframeSchemaSortedKeys.has(componentName)) {
	                  aframeSchemaSortedKeys.set(componentName, [].concat(_toConsumableArray(Object.keys(AFRAME.components[componentName].schema))).sort());
	                }

	                var aframeSchemaKeys = aframeSchemaSortedKeys.get(componentName);

	                for (var j = 0; j <= aframeSchemaKeys.length; j++) {
	                  var key = aframeSchemaKeys[j];

	                  if (dataToSync[key] !== undefined) {
	                    flexbuilder.addInt(j);

	                    var value = dataToSync[key];

	                    if (typeof value === 'number') {
	                      if (Number.isInteger(value)) {
	                        if (value > 2147483647 || value < -2147483648) {
	                          NAF.log.error('64 bit integers not supported', value, componentSchema);
	                        } else {
	                          flexbuilder.add(value);
	                        }
	                      } else {
	                        flexbuilder.add(Math.fround(value));
	                      }
	                    } else {
	                      flexbuilder.add(value);
	                    }
	                  }
	                }
	              }
	            } else {
	              flexbuilder.addInt(3);
	              flexbuilder.addInt(0);

	              var _value = dataToSync;

	              if ((typeof _value === 'undefined' ? 'undefined' : _typeof(_value)) === 'object') {
	                NAF.log.error('Schema should not set property for object or array values', _value, componentSchema);
	              } else if (typeof _value === 'number') {
	                if (Number.isInteger(_value)) {
	                  if (_value > 2147483647 || _value < -2147483648) {
	                    NAF.log.error('64 bit integers not supported', _value, componentSchema);
	                  } else {
	                    flexbuilder.add(_value);
	                  }
	                } else {
	                  flexbuilder.add(Math.fround(_value));
	                }
	              } else {
	                flexbuilder.add(_value);
	              }
	            }
	          }

	          flexbuilder.end();
	        }
	      }
	    }

	    if (hadComponents) {
	      flexbuilder.end();
	    }

	    return hadComponents;
	  },

	  canSync: function canSync() {
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

	    var clients = NAF.connection.getConnectedClients();

	    for (var clientId in clients) {
	      if (clientId === this.data.owner) return false;
	    }

	    return true;
	  },

	  getParentId: function getParentId() {
	    this.initNetworkParent(); // TODO fix calling this each network tick
	    if (!this.parent) {
	      return null;
	    }
	    var netComp = this.parent.getAttribute('networked');
	    return netComp.networkId;
	  },

	  /* Receiving updates */

	  networkUpdate: function networkUpdate(updateRef, sender) {
	    try {
	      clientIdByteBuf.length = 20;
	      for (var i = 0; i < 20; i++) {
	        clientIdByteBuf[i] = updateRef.owner(i);
	      }

	      var entityDataOwner = bytesToHex(clientIdByteBuf);
	      var ownerTimeLong = updateRef.lastOwnerTime();
	      var entityDataLastOwnerTime = ownerTimeLong.high * 0x40000000 + ownerTimeLong.low;

	      // Avoid updating components if the entity data received did not come from the current owner.
	      if (entityDataLastOwnerTime < this.lastOwnerTime || this.lastOwnerTime === entityDataLastOwnerTime && this.data.owner > entityDataOwner) {
	        return;
	      }

	      var isFullSync = updateRef.fullUpdateData(fullUpdateDataRef) != null;

	      if (isFullSync && this.data.owner !== entityDataOwner) {
	        var wasMine = this.isMine();
	        this.lastOwnerTime = entityDataLastOwnerTime;

	        var oldOwner = this.data.owner;
	        var newOwner = entityDataOwner;

	        this.el.setAttribute('networked', { owner: entityDataOwner });

	        if (wasMine) {
	          this.onOwnershipLostEvent.newOwner = newOwner;
	          this.el.emit(this.OWNERSHIP_LOST, this.onOwnershipLostEvent);
	        }
	        this.onOwnershipChangedEvent.oldOwner = oldOwner;
	        this.onOwnershipChangedEvent.newOwner = newOwner;
	        this.el.emit(this.OWNERSHIP_CHANGED, this.onOwnershipChangedEvent);
	      }
	      if (isFullSync && this.data.persistent !== fullUpdateDataRef.persistent()) {
	        this.el.setAttribute('networked', { persistent: fullUpdateDataRef.persistent() });
	      }

	      var componentArray = updateRef.componentsArray();
	      var dataView = new DataView(componentArray.buffer, componentArray.byteOffset, componentArray.byteLength);
	      var len = dataView.byteLength;
	      var byteWidth = dataView.getUint8(len - 1);
	      var packedType = dataView.getUint8(len - 2);
	      var parentWidth = fromByteWidth(byteWidth);
	      var offset = len - byteWidth - 2;
	      var entityDataRef = new Reference(dataView, offset, parentWidth, packedType, '/');

	      this.updateNetworkedComponents(entityDataRef, isFullSync, sender);
	    } catch (e) {
	      var now = performance.now();

	      if (now - this.lastErrorLoggedAt > 1000) {
	        this.lastErrorLoggedAt = now;
	        NAF.log.error('Error updating from network', sender, updateRef && updateRef.bb && updateRef.bb.bytes, e);
	      }
	    }
	  },

	  updateNetworkedComponents: function updateNetworkedComponents(entityDataRef, isFullSync, sender) {
	    this.startLerpingFrame();

	    var len = entityDataRef.length();

	    for (var iData = 0; iData < len; iData++) {
	      var componentDataRef = tmpRef;
	      refCp(entityDataRef, componentDataRef);
	      refAdvanceToIndexGet(componentDataRef, iData);
	      var componentIndex = refGetInt(componentDataRef, 0);
	      var componentSchema = this.componentSchemas[componentIndex];
	      var el = this.getCachedElement(componentIndex);

	      if (el === null) continue;

	      var componentName = componentSchema.component ? componentSchema.component : componentSchema;

	      if (!OBJECT3D_COMPONENTS.includes(componentName)) {
	        var type = refGetInt(componentDataRef, 1);

	        if (type !== 3) {
	          switch (type) {
	            case 0:
	              // Vector2
	              el.setAttribute(componentName, _defineProperty({}, componentSchema.property, new THREE.Vector2(refGetNumeric(componentDataRef, 2) || 0, refGetNumeric(componentDataRef, 3) || 0)));
	              break;
	            case 1:
	              // Vector3
	              el.setAttribute(componentName, _defineProperty({}, componentSchema.property, new THREE.Vector3(refGetNumeric(componentDataRef, 2) || 0, refGetNumeric(componentDataRef, 3) || 0, refGetNumeric(componentDataRef, 4) || 0)));
	              break;
	            case 2:
	              // Quaternion
	              el.setAttribute(componentName, _defineProperty({}, componentSchema.property, new THREE.Quaternion(refGetNumeric(componentDataRef, 2) || 0, refGetNumeric(componentDataRef, 3) || 0, refGetNumeric(componentDataRef, 4) || 0, refGetNumeric(componentDataRef, 5) || 0)));
	              break;
	          }
	        } else {
	          if (componentSchema.property) {
	            // Skip the property index which is always zero for this.
	            var attributeValue = _defineProperty({}, componentSchema.property, refGetToObject(componentDataRef, 3));

	            if (NAF.connection.adapter.sanitizeComponentValues(this.el, componentName, attributeValue, sender)) {
	              el.setAttribute(componentName, attributeValue);
	            }
	          } else {
	            if (!aframeSchemaSortedKeys.has(componentName)) {
	              var schema = AFRAME.components[componentName].schema;

	              if (schema.default) {
	                aframeSchemaSortedKeys.set(componentName, []);
	              } else {
	                aframeSchemaSortedKeys.set(componentName, [].concat(_toConsumableArray(Object.keys(AFRAME.components[componentName].schema))).sort());
	              }
	            }

	            var componentDataLength = componentDataRef.length();

	            if (componentDataLength > 1) {
	              var _attributeValue2 = {};
	              var aframeSchemaKeys = aframeSchemaSortedKeys.get(componentName);

	              for (var j = 2; j < componentDataLength; j += 2) {
	                var key = refGetInt(componentDataRef, j);
	                var value = refGetToObject(componentDataRef, j + 1);

	                if (aframeSchemaKeys.length === 0) {
	                  // default value case
	                  _attributeValue2 = value;
	                  break;
	                } else {
	                  _attributeValue2[aframeSchemaKeys[key]] = value;
	                }
	              }

	              if (NAF.connection.adapter.sanitizeComponentValues(this.el, componentName, _attributeValue2, sender)) {
	                el.setAttribute(componentName, _attributeValue2);
	              }
	            }
	          }
	        }
	      } else {
	        if (NAF.connection.adapter.authorizeEntityManipulation(this.el, sender)) {
	          var x = refGetNumeric(componentDataRef, 1) || 0;
	          var y = refGetNumeric(componentDataRef, 2) || 0;
	          var z = refGetNumeric(componentDataRef, 3) || 0;

	          var lerper = void 0;

	          for (var i = 0, l = this.lerpers.length; i < l; i++) {
	            var info = this.lerpers[i];

	            if (info.object3D === el.object3D) {
	              lerper = info.lerper;
	              break;
	            }
	          }

	          if (!lerper) {
	            lerper = new Lerper(NAF.options.updateRate, NAF.options.maxLerpDistance);
	            this.lerpers.push({ lerper: lerper, object3D: el.object3D });
	            lerper.startFrame();
	          }

	          switch (componentName) {
	            case 'position':
	              lerper.setPosition(x, y, z);
	              break;
	            case 'rotation':
	              this.conversionEuler.set(DEG2RAD * x, DEG2RAD * y, DEG2RAD * z);
	              tmpQuaternion.setFromEuler(this.conversionEuler);
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
	    }
	  },

	  startLerpingFrame: function startLerpingFrame() {
	    if (!this.lerpers) return;

	    for (var i = 0; i < this.lerpers.length; i++) {
	      this.lerpers[i].lerper.startFrame();
	    }
	  },

	  removeLerp: function removeLerp() {
	    this.lerpers = [];
	  },

	  remove: function remove() {
	    if (this.isMine() && NAF.connection.isConnected()) {
	      if (NAF.entities.hasEntity(this.data.networkId)) {
	        flatbuilder.clear();
	        var networkIdOffset = flatbuilder.createString(this.data.networkId);
	        var deleteOffset = FBDeleteOp.createDeleteOp(flatbuilder, networkIdOffset);
	        var deletesOffset = FBSceneUpdate.createDeletesVector(flatbuilder, [deleteOffset]);
	        FBSceneUpdate.startSceneUpdate(flatbuilder);
	        FBSceneUpdate.addDeletes(flatbuilder, deletesOffset);
	        var sceneUpdateOffset = FBSceneUpdate.endSceneUpdate(flatbuilder);

	        flatbuilder.finish(FBMessage.createMessage(flatbuilder, FBMessageData.SceneUpdate, sceneUpdateOffset));

	        NAF.connection.broadcastDataGuaranteed(flatbuilder.asUint8Array());
	      } else {
	        NAF.log.error('Removing networked entity that is not in entities array.');
	      }
	    }
	    NAF.entities.forgetEntity(this.data.networkId);
	    document.body.dispatchEvent(this.entityRemovedEvent(this.data.networkId));
	    this.el.sceneEl.systems.networked.deregister(this);
	  },

	  entityCreatedEvent: function entityCreatedEvent() {
	    return new CustomEvent('entityCreated', { detail: { el: this.el } });
	  },
	  entityRemovedEvent: function entityRemovedEvent(networkId) {
	    return new CustomEvent('entityRemoved', { detail: { networkId: networkId } });
	  }
	});

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.encode = exports.toObject = exports.builder = exports.toReference = void 0;
	/* eslint-disable @typescript-eslint/no-namespace */
	var builder_1 = __webpack_require__(35);
	var reference_1 = __webpack_require__(42);
	var reference_2 = __webpack_require__(42);
	Object.defineProperty(exports, "toReference", { enumerable: true, get: function get() {
	        return reference_2.toReference;
	    } });
	function builder() {
	    return new builder_1.Builder();
	}
	exports.builder = builder;
	function toObject(buffer) {
	    return (0, reference_1.toReference)(buffer).toObject();
	}
	exports.toObject = toObject;
	function encode(object, size, deduplicateStrings, deduplicateKeys, deduplicateKeyVectors) {
	    if (size === void 0) {
	        size = 2048;
	    }
	    if (deduplicateStrings === void 0) {
	        deduplicateStrings = true;
	    }
	    if (deduplicateKeys === void 0) {
	        deduplicateKeys = true;
	    }
	    if (deduplicateKeyVectors === void 0) {
	        deduplicateKeyVectors = true;
	    }
	    var builder = new builder_1.Builder(size > 0 ? size : 2048, deduplicateStrings, deduplicateKeys, deduplicateKeyVectors);
	    builder.add(object);
	    return builder.finish();
	}
	exports.encode = encode;

/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Builder = void 0;
	var bit_width_1 = __webpack_require__(36);
	var bit_width_util_1 = __webpack_require__(37);
	var flexbuffers_util_1 = __webpack_require__(38);
	var value_type_1 = __webpack_require__(39);
	var value_type_util_1 = __webpack_require__(40);
	var stack_value_1 = __webpack_require__(41);
	var Builder = /** @class */function () {
	    function Builder(size, dedupStrings, dedupKeys, dedupKeyVectors) {
	        if (size === void 0) {
	            size = 2048;
	        }
	        if (dedupStrings === void 0) {
	            dedupStrings = true;
	        }
	        if (dedupKeys === void 0) {
	            dedupKeys = true;
	        }
	        if (dedupKeyVectors === void 0) {
	            dedupKeyVectors = true;
	        }
	        this.dedupStrings = dedupStrings;
	        this.dedupKeys = dedupKeys;
	        this.dedupKeyVectors = dedupKeyVectors;
	        this.stack = [];
	        this.stackPointers = [];
	        this.offset = 0;
	        this.finished = false;
	        this.stringLookup = {};
	        this.keyLookup = {};
	        this.keyVectorLookup = {};
	        this.indirectIntLookup = {};
	        this.indirectUIntLookup = {};
	        this.indirectFloatLookup = {};
	        this.buffer = new ArrayBuffer(size > 0 ? size : 2048);
	        this.view = new DataView(this.buffer);
	    }
	    Builder.prototype.align = function (width) {
	        var byteWidth = (0, bit_width_util_1.toByteWidth)(width);
	        this.offset += (0, bit_width_util_1.paddingSize)(this.offset, byteWidth);
	        return byteWidth;
	    };
	    Builder.prototype.computeOffset = function (newValueSize) {
	        var targetOffset = this.offset + newValueSize;
	        var size = this.buffer.byteLength;
	        var prevSize = size;
	        while (size < targetOffset) {
	            size <<= 1;
	        }
	        if (prevSize < size) {
	            var prevBuffer = this.buffer;
	            this.buffer = new ArrayBuffer(size);
	            this.view = new DataView(this.buffer);
	            new Uint8Array(this.buffer).set(new Uint8Array(prevBuffer), 0);
	        }
	        return targetOffset;
	    };
	    Builder.prototype.pushInt = function (value, width) {
	        if (width === bit_width_1.BitWidth.WIDTH8) {
	            this.view.setInt8(this.offset, value);
	        } else if (width === bit_width_1.BitWidth.WIDTH16) {
	            this.view.setInt16(this.offset, value, true);
	        } else if (width === bit_width_1.BitWidth.WIDTH32) {
	            this.view.setInt32(this.offset, value, true);
	        } else if (width === bit_width_1.BitWidth.WIDTH64) {
	            this.view.setBigInt64(this.offset, BigInt(value), true);
	        } else {
	            throw "Unexpected width: ".concat(width, " for value: ").concat(value);
	        }
	    };
	    Builder.prototype.pushUInt = function (value, width) {
	        if (width === bit_width_1.BitWidth.WIDTH8) {
	            this.view.setUint8(this.offset, value);
	        } else if (width === bit_width_1.BitWidth.WIDTH16) {
	            this.view.setUint16(this.offset, value, true);
	        } else if (width === bit_width_1.BitWidth.WIDTH32) {
	            this.view.setUint32(this.offset, value, true);
	        } else if (width === bit_width_1.BitWidth.WIDTH64) {
	            this.view.setBigUint64(this.offset, BigInt(value), true);
	        } else {
	            throw "Unexpected width: ".concat(width, " for value: ").concat(value);
	        }
	    };
	    Builder.prototype.writeInt = function (value, byteWidth) {
	        var newOffset = this.computeOffset(byteWidth);
	        this.pushInt(value, (0, bit_width_util_1.fromByteWidth)(byteWidth));
	        this.offset = newOffset;
	    };
	    Builder.prototype.writeUInt = function (value, byteWidth) {
	        var newOffset = this.computeOffset(byteWidth);
	        this.pushUInt(value, (0, bit_width_util_1.fromByteWidth)(byteWidth));
	        this.offset = newOffset;
	    };
	    Builder.prototype.writeBlob = function (arrayBuffer) {
	        var length = arrayBuffer.byteLength;
	        var bitWidth = (0, bit_width_util_1.uwidth)(length);
	        var byteWidth = this.align(bitWidth);
	        this.writeUInt(length, byteWidth);
	        var blobOffset = this.offset;
	        var newOffset = this.computeOffset(length);
	        new Uint8Array(this.buffer).set(new Uint8Array(arrayBuffer), blobOffset);
	        this.stack.push(this.offsetStackValue(blobOffset, value_type_1.ValueType.BLOB, bitWidth));
	        this.offset = newOffset;
	    };
	    Builder.prototype.writeString = function (str) {
	        if (this.dedupStrings && Object.prototype.hasOwnProperty.call(this.stringLookup, str)) {
	            this.stack.push(this.stringLookup[str]);
	            return;
	        }
	        var utf8 = (0, flexbuffers_util_1.toUTF8Array)(str);
	        var length = utf8.length;
	        var bitWidth = (0, bit_width_util_1.uwidth)(length);
	        var byteWidth = this.align(bitWidth);
	        this.writeUInt(length, byteWidth);
	        var stringOffset = this.offset;
	        var newOffset = this.computeOffset(length + 1);
	        new Uint8Array(this.buffer).set(utf8, stringOffset);
	        var stackValue = this.offsetStackValue(stringOffset, value_type_1.ValueType.STRING, bitWidth);
	        this.stack.push(stackValue);
	        if (this.dedupStrings) {
	            this.stringLookup[str] = stackValue;
	        }
	        this.offset = newOffset;
	    };
	    Builder.prototype.writeKey = function (str) {
	        if (this.dedupKeys && Object.prototype.hasOwnProperty.call(this.keyLookup, str)) {
	            this.stack.push(this.keyLookup[str]);
	            return;
	        }
	        var utf8 = (0, flexbuffers_util_1.toUTF8Array)(str);
	        var length = utf8.length;
	        var newOffset = this.computeOffset(length + 1);
	        new Uint8Array(this.buffer).set(utf8, this.offset);
	        var stackValue = this.offsetStackValue(this.offset, value_type_1.ValueType.KEY, bit_width_1.BitWidth.WIDTH8);
	        this.stack.push(stackValue);
	        if (this.dedupKeys) {
	            this.keyLookup[str] = stackValue;
	        }
	        this.offset = newOffset;
	    };
	    Builder.prototype.writeStackValue = function (value, byteWidth) {
	        var newOffset = this.computeOffset(byteWidth);
	        if (value.isOffset()) {
	            var relativeOffset = this.offset - value.offset;
	            if (byteWidth === 8 || BigInt(relativeOffset) < BigInt(1) << BigInt(byteWidth * 8)) {
	                this.writeUInt(relativeOffset, byteWidth);
	            } else {
	                throw "Unexpected size ".concat(byteWidth, ". This might be a bug. Please create an issue https://github.com/google/flatbuffers/issues/new");
	            }
	        } else {
	            value.writeToBuffer(byteWidth);
	        }
	        this.offset = newOffset;
	    };
	    Builder.prototype.integrityCheckOnValueAddition = function () {
	        if (this.finished) {
	            throw "Adding values after finish is prohibited";
	        }
	        if (this.stackPointers.length !== 0 && this.stackPointers[this.stackPointers.length - 1].isVector === false) {
	            if (this.stack[this.stack.length - 1].type !== value_type_1.ValueType.KEY) {
	                throw "Adding value to a map before adding a key is prohibited";
	            }
	        }
	    };
	    Builder.prototype.integrityCheckOnKeyAddition = function () {
	        if (this.finished) {
	            throw "Adding values after finish is prohibited";
	        }
	        if (this.stackPointers.length === 0 || this.stackPointers[this.stackPointers.length - 1].isVector) {
	            throw "Adding key before starting a map is prohibited";
	        }
	    };
	    Builder.prototype.startVector = function () {
	        this.stackPointers.push({ stackPosition: this.stack.length, isVector: true });
	    };
	    Builder.prototype.startMap = function (presorted) {
	        if (presorted === void 0) {
	            presorted = false;
	        }
	        this.stackPointers.push({ stackPosition: this.stack.length, isVector: false, presorted: presorted });
	    };
	    Builder.prototype.endVector = function (stackPointer) {
	        var vecLength = this.stack.length - stackPointer.stackPosition;
	        var vec = this.createVector(stackPointer.stackPosition, vecLength, 1);
	        this.stack.splice(stackPointer.stackPosition, vecLength);
	        this.stack.push(vec);
	    };
	    Builder.prototype.endMap = function (stackPointer) {
	        if (!stackPointer.presorted) {
	            this.sort(stackPointer);
	        }
	        var keyVectorHash = "";
	        for (var i = stackPointer.stackPosition; i < this.stack.length; i += 2) {
	            keyVectorHash += ",".concat(this.stack[i].offset);
	        }
	        var vecLength = this.stack.length - stackPointer.stackPosition >> 1;
	        if (this.dedupKeyVectors && !Object.prototype.hasOwnProperty.call(this.keyVectorLookup, keyVectorHash)) {
	            this.keyVectorLookup[keyVectorHash] = this.createVector(stackPointer.stackPosition, vecLength, 2);
	        }
	        var keysStackValue = this.dedupKeyVectors ? this.keyVectorLookup[keyVectorHash] : this.createVector(stackPointer.stackPosition, vecLength, 2);
	        var valuesStackValue = this.createVector(stackPointer.stackPosition + 1, vecLength, 2, keysStackValue);
	        this.stack.splice(stackPointer.stackPosition, vecLength << 1);
	        this.stack.push(valuesStackValue);
	    };
	    Builder.prototype.sort = function (stackPointer) {
	        var view = this.view;
	        var stack = this.stack;
	        function shouldFlip(v1, v2) {
	            if (v1.type !== value_type_1.ValueType.KEY || v2.type !== value_type_1.ValueType.KEY) {
	                throw "Stack values are not keys ".concat(v1, " | ").concat(v2, ". Check if you combined [addKey] with add... method calls properly.");
	            }
	            var c1, c2;
	            var index = 0;
	            do {
	                c1 = view.getUint8(v1.offset + index);
	                c2 = view.getUint8(v2.offset + index);
	                if (c2 < c1) return true;
	                if (c1 < c2) return false;
	                index += 1;
	            } while (c1 !== 0 && c2 !== 0);
	            return false;
	        }
	        function swap(stack, flipIndex, i) {
	            if (flipIndex === i) return;
	            var k = stack[flipIndex];
	            var v = stack[flipIndex + 1];
	            stack[flipIndex] = stack[i];
	            stack[flipIndex + 1] = stack[i + 1];
	            stack[i] = k;
	            stack[i + 1] = v;
	        }
	        function selectionSort() {
	            for (var i = stackPointer.stackPosition; i < stack.length; i += 2) {
	                var flipIndex = i;
	                for (var j = i + 2; j < stack.length; j += 2) {
	                    if (shouldFlip(stack[flipIndex], stack[j])) {
	                        flipIndex = j;
	                    }
	                }
	                if (flipIndex !== i) {
	                    swap(stack, flipIndex, i);
	                }
	            }
	        }
	        function smaller(v1, v2) {
	            if (v1.type !== value_type_1.ValueType.KEY || v2.type !== value_type_1.ValueType.KEY) {
	                throw "Stack values are not keys ".concat(v1, " | ").concat(v2, ". Check if you combined [addKey] with add... method calls properly.");
	            }
	            if (v1.offset === v2.offset) {
	                return false;
	            }
	            var c1, c2;
	            var index = 0;
	            do {
	                c1 = view.getUint8(v1.offset + index);
	                c2 = view.getUint8(v2.offset + index);
	                if (c1 < c2) return true;
	                if (c2 < c1) return false;
	                index += 1;
	            } while (c1 !== 0 && c2 !== 0);
	            return false;
	        }
	        function quickSort(left, right) {
	            if (left < right) {
	                var mid = left + (right - left >> 2) * 2;
	                var pivot = stack[mid];
	                var left_new = left;
	                var right_new = right;
	                do {
	                    while (smaller(stack[left_new], pivot)) {
	                        left_new += 2;
	                    }
	                    while (smaller(pivot, stack[right_new])) {
	                        right_new -= 2;
	                    }
	                    if (left_new <= right_new) {
	                        swap(stack, left_new, right_new);
	                        left_new += 2;
	                        right_new -= 2;
	                    }
	                } while (left_new <= right_new);
	                quickSort(left, right_new);
	                quickSort(left_new, right);
	            }
	        }
	        var sorted = true;
	        for (var i = stackPointer.stackPosition; i < this.stack.length - 2; i += 2) {
	            if (shouldFlip(this.stack[i], this.stack[i + 2])) {
	                sorted = false;
	                break;
	            }
	        }
	        if (!sorted) {
	            if (this.stack.length - stackPointer.stackPosition > 40) {
	                quickSort(stackPointer.stackPosition, this.stack.length - 2);
	            } else {
	                selectionSort();
	            }
	        }
	    };
	    Builder.prototype.end = function () {
	        if (this.stackPointers.length < 1) return;
	        var pointer = this.stackPointers.pop();
	        if (pointer.isVector) {
	            this.endVector(pointer);
	        } else {
	            this.endMap(pointer);
	        }
	    };
	    Builder.prototype.createVector = function (start, vecLength, step, keys) {
	        if (keys === void 0) {
	            keys = null;
	        }
	        var bitWidth = (0, bit_width_util_1.uwidth)(vecLength);
	        var prefixElements = 1;
	        if (keys !== null) {
	            var elementWidth = keys.elementWidth(this.offset, 0);
	            if (elementWidth > bitWidth) {
	                bitWidth = elementWidth;
	            }
	            prefixElements += 2;
	        }
	        var vectorType = value_type_1.ValueType.KEY;
	        var typed = keys === null;
	        for (var i = start; i < this.stack.length; i += step) {
	            var elementWidth = this.stack[i].elementWidth(this.offset, i + prefixElements);
	            if (elementWidth > bitWidth) {
	                bitWidth = elementWidth;
	            }
	            if (i === start) {
	                vectorType = this.stack[i].type;
	                typed = typed && (0, value_type_util_1.isTypedVectorElement)(vectorType);
	            } else {
	                if (vectorType !== this.stack[i].type) {
	                    typed = false;
	                }
	            }
	        }
	        var byteWidth = this.align(bitWidth);
	        var fix = typed && (0, value_type_util_1.isNumber)(vectorType) && vecLength >= 2 && vecLength <= 4;
	        if (keys !== null) {
	            this.writeStackValue(keys, byteWidth);
	            this.writeUInt(1 << keys.width, byteWidth);
	        }
	        if (!fix) {
	            this.writeUInt(vecLength, byteWidth);
	        }
	        var vecOffset = this.offset;
	        for (var i = start; i < this.stack.length; i += step) {
	            this.writeStackValue(this.stack[i], byteWidth);
	        }
	        if (!typed) {
	            for (var i = start; i < this.stack.length; i += step) {
	                this.writeUInt(this.stack[i].storedPackedType(), 1);
	            }
	        }
	        if (keys !== null) {
	            return this.offsetStackValue(vecOffset, value_type_1.ValueType.MAP, bitWidth);
	        }
	        if (typed) {
	            var vType = (0, value_type_util_1.toTypedVector)(vectorType, fix ? vecLength : 0);
	            return this.offsetStackValue(vecOffset, vType, bitWidth);
	        }
	        return this.offsetStackValue(vecOffset, value_type_1.ValueType.VECTOR, bitWidth);
	    };
	    Builder.prototype.nullStackValue = function () {
	        return new stack_value_1.StackValue(this, value_type_1.ValueType.NULL, bit_width_1.BitWidth.WIDTH8);
	    };
	    Builder.prototype.boolStackValue = function (value) {
	        return new stack_value_1.StackValue(this, value_type_1.ValueType.BOOL, bit_width_1.BitWidth.WIDTH8, value);
	    };
	    Builder.prototype.intStackValue = function (value) {
	        return new stack_value_1.StackValue(this, value_type_1.ValueType.INT, (0, bit_width_util_1.iwidth)(value), value);
	    };
	    Builder.prototype.uintStackValue = function (value) {
	        return new stack_value_1.StackValue(this, value_type_1.ValueType.UINT, (0, bit_width_util_1.uwidth)(value), value);
	    };
	    Builder.prototype.floatStackValue = function (value) {
	        return new stack_value_1.StackValue(this, value_type_1.ValueType.FLOAT, (0, bit_width_util_1.fwidth)(value), value);
	    };
	    Builder.prototype.offsetStackValue = function (offset, valueType, bitWidth) {
	        return new stack_value_1.StackValue(this, valueType, bitWidth, null, offset);
	    };
	    Builder.prototype.finishBuffer = function () {
	        if (this.stack.length !== 1) {
	            throw "Stack has to be exactly 1, but it is ".concat(this.stack.length, ". You have to end all started vectors and maps before calling [finish]");
	        }
	        var value = this.stack[0];
	        var byteWidth = this.align(value.elementWidth(this.offset, 0));
	        this.writeStackValue(value, byteWidth);
	        this.writeUInt(value.storedPackedType(), 1);
	        this.writeUInt(byteWidth, 1);
	        this.finished = true;
	    };
	    Builder.prototype.add = function (value) {
	        this.integrityCheckOnValueAddition();
	        if (typeof value === 'undefined') {
	            throw "You need to provide a value";
	        }
	        if (value === null) {
	            this.stack.push(this.nullStackValue());
	        } else if (typeof value === "boolean") {
	            this.stack.push(this.boolStackValue(value));
	        } else if (typeof value === "bigint") {
	            this.stack.push(this.intStackValue(value));
	        } else if (typeof value == 'number') {
	            if (Number.isInteger(value)) {
	                this.stack.push(this.intStackValue(value));
	            } else {
	                this.stack.push(this.floatStackValue(value));
	            }
	        } else if (ArrayBuffer.isView(value)) {
	            this.writeBlob(value.buffer);
	        } else if (typeof value === 'string' || value instanceof String) {
	            this.writeString(value);
	        } else if (Array.isArray(value)) {
	            this.startVector();
	            for (var i = 0; i < value.length; i++) {
	                this.add(value[i]);
	            }
	            this.end();
	        } else if ((typeof value === "undefined" ? "undefined" : _typeof(value)) === 'object') {
	            var properties = Object.getOwnPropertyNames(value).sort();
	            this.startMap(true);
	            for (var i = 0; i < properties.length; i++) {
	                var key = properties[i];
	                this.addKey(key);
	                this.add(value[key]);
	            }
	            this.end();
	        } else {
	            throw "Unexpected value input ".concat(value);
	        }
	    };
	    Builder.prototype.finish = function () {
	        if (!this.finished) {
	            this.finishBuffer();
	        }
	        var result = this.buffer.slice(0, this.offset);
	        return new Uint8Array(result);
	    };
	    Builder.prototype.isFinished = function () {
	        return this.finished;
	    };
	    Builder.prototype.addKey = function (key) {
	        this.integrityCheckOnKeyAddition();
	        this.writeKey(key);
	    };
	    Builder.prototype.addInt = function (value, indirect, deduplicate) {
	        if (indirect === void 0) {
	            indirect = false;
	        }
	        if (deduplicate === void 0) {
	            deduplicate = false;
	        }
	        this.integrityCheckOnValueAddition();
	        if (!indirect) {
	            this.stack.push(this.intStackValue(value));
	            return;
	        }
	        if (deduplicate && Object.prototype.hasOwnProperty.call(this.indirectIntLookup, value)) {
	            this.stack.push(this.indirectIntLookup[value]);
	            return;
	        }
	        var stackValue = this.intStackValue(value);
	        var byteWidth = this.align(stackValue.width);
	        var newOffset = this.computeOffset(byteWidth);
	        var valueOffset = this.offset;
	        stackValue.writeToBuffer(byteWidth);
	        var stackOffset = this.offsetStackValue(valueOffset, value_type_1.ValueType.INDIRECT_INT, stackValue.width);
	        this.stack.push(stackOffset);
	        this.offset = newOffset;
	        if (deduplicate) {
	            this.indirectIntLookup[value] = stackOffset;
	        }
	    };
	    Builder.prototype.addUInt = function (value, indirect, deduplicate) {
	        if (indirect === void 0) {
	            indirect = false;
	        }
	        if (deduplicate === void 0) {
	            deduplicate = false;
	        }
	        this.integrityCheckOnValueAddition();
	        if (!indirect) {
	            this.stack.push(this.uintStackValue(value));
	            return;
	        }
	        if (deduplicate && Object.prototype.hasOwnProperty.call(this.indirectUIntLookup, value)) {
	            this.stack.push(this.indirectUIntLookup[value]);
	            return;
	        }
	        var stackValue = this.uintStackValue(value);
	        var byteWidth = this.align(stackValue.width);
	        var newOffset = this.computeOffset(byteWidth);
	        var valueOffset = this.offset;
	        stackValue.writeToBuffer(byteWidth);
	        var stackOffset = this.offsetStackValue(valueOffset, value_type_1.ValueType.INDIRECT_UINT, stackValue.width);
	        this.stack.push(stackOffset);
	        this.offset = newOffset;
	        if (deduplicate) {
	            this.indirectUIntLookup[value] = stackOffset;
	        }
	    };
	    Builder.prototype.addFloat = function (value, indirect, deduplicate) {
	        if (indirect === void 0) {
	            indirect = false;
	        }
	        if (deduplicate === void 0) {
	            deduplicate = false;
	        }
	        this.integrityCheckOnValueAddition();
	        if (!indirect) {
	            this.stack.push(this.floatStackValue(value));
	            return;
	        }
	        if (deduplicate && Object.prototype.hasOwnProperty.call(this.indirectFloatLookup, value)) {
	            this.stack.push(this.indirectFloatLookup[value]);
	            return;
	        }
	        var stackValue = this.floatStackValue(value);
	        var byteWidth = this.align(stackValue.width);
	        var newOffset = this.computeOffset(byteWidth);
	        var valueOffset = this.offset;
	        stackValue.writeToBuffer(byteWidth);
	        var stackOffset = this.offsetStackValue(valueOffset, value_type_1.ValueType.INDIRECT_FLOAT, stackValue.width);
	        this.stack.push(stackOffset);
	        this.offset = newOffset;
	        if (deduplicate) {
	            this.indirectFloatLookup[value] = stackOffset;
	        }
	    };
	    return Builder;
	}();
	exports.Builder = Builder;

/***/ }),
/* 36 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.BitWidth = void 0;
	var BitWidth;
	(function (BitWidth) {
	    BitWidth[BitWidth["WIDTH8"] = 0] = "WIDTH8";
	    BitWidth[BitWidth["WIDTH16"] = 1] = "WIDTH16";
	    BitWidth[BitWidth["WIDTH32"] = 2] = "WIDTH32";
	    BitWidth[BitWidth["WIDTH64"] = 3] = "WIDTH64";
	})(BitWidth = exports.BitWidth || (exports.BitWidth = {}));

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.paddingSize = exports.fromByteWidth = exports.uwidth = exports.fwidth = exports.iwidth = exports.toByteWidth = void 0;
	var bit_width_1 = __webpack_require__(36);
	function toByteWidth(bitWidth) {
	    return 1 << bitWidth;
	}
	exports.toByteWidth = toByteWidth;
	function iwidth(value) {
	    if (value >= -128 && value <= 127) return bit_width_1.BitWidth.WIDTH8;
	    if (value >= -32768 && value <= 32767) return bit_width_1.BitWidth.WIDTH16;
	    if (value >= -2147483648 && value <= 2147483647) return bit_width_1.BitWidth.WIDTH32;
	    return bit_width_1.BitWidth.WIDTH64;
	}
	exports.iwidth = iwidth;
	function fwidth(value) {
	    return value === Math.fround(value) ? bit_width_1.BitWidth.WIDTH32 : bit_width_1.BitWidth.WIDTH64;
	}
	exports.fwidth = fwidth;
	function uwidth(value) {
	    if (value <= 255) return bit_width_1.BitWidth.WIDTH8;
	    if (value <= 65535) return bit_width_1.BitWidth.WIDTH16;
	    if (value <= 4294967295) return bit_width_1.BitWidth.WIDTH32;
	    return bit_width_1.BitWidth.WIDTH64;
	}
	exports.uwidth = uwidth;
	function fromByteWidth(value) {
	    if (value === 1) return bit_width_1.BitWidth.WIDTH8;
	    if (value === 2) return bit_width_1.BitWidth.WIDTH16;
	    if (value === 4) return bit_width_1.BitWidth.WIDTH32;
	    return bit_width_1.BitWidth.WIDTH64;
	}
	exports.fromByteWidth = fromByteWidth;
	function paddingSize(bufSize, scalarSize) {
	    return ~bufSize + 1 & scalarSize - 1;
	}
	exports.paddingSize = paddingSize;

/***/ }),
/* 38 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.toUTF8Array = exports.fromUTF8Array = void 0;
	function fromUTF8Array(data) {
	    var decoder = new TextDecoder();
	    return decoder.decode(data);
	}
	exports.fromUTF8Array = fromUTF8Array;
	function toUTF8Array(str) {
	    var encoder = new TextEncoder();
	    return encoder.encode(str);
	}
	exports.toUTF8Array = toUTF8Array;

/***/ }),
/* 39 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ValueType = void 0;
	var ValueType;
	(function (ValueType) {
	    ValueType[ValueType["NULL"] = 0] = "NULL";
	    ValueType[ValueType["INT"] = 1] = "INT";
	    ValueType[ValueType["UINT"] = 2] = "UINT";
	    ValueType[ValueType["FLOAT"] = 3] = "FLOAT";
	    ValueType[ValueType["KEY"] = 4] = "KEY";
	    ValueType[ValueType["STRING"] = 5] = "STRING";
	    ValueType[ValueType["INDIRECT_INT"] = 6] = "INDIRECT_INT";
	    ValueType[ValueType["INDIRECT_UINT"] = 7] = "INDIRECT_UINT";
	    ValueType[ValueType["INDIRECT_FLOAT"] = 8] = "INDIRECT_FLOAT";
	    ValueType[ValueType["MAP"] = 9] = "MAP";
	    ValueType[ValueType["VECTOR"] = 10] = "VECTOR";
	    ValueType[ValueType["VECTOR_INT"] = 11] = "VECTOR_INT";
	    ValueType[ValueType["VECTOR_UINT"] = 12] = "VECTOR_UINT";
	    ValueType[ValueType["VECTOR_FLOAT"] = 13] = "VECTOR_FLOAT";
	    ValueType[ValueType["VECTOR_KEY"] = 14] = "VECTOR_KEY";
	    ValueType[ValueType["VECTOR_STRING_DEPRECATED"] = 15] = "VECTOR_STRING_DEPRECATED";
	    ValueType[ValueType["VECTOR_INT2"] = 16] = "VECTOR_INT2";
	    ValueType[ValueType["VECTOR_UINT2"] = 17] = "VECTOR_UINT2";
	    ValueType[ValueType["VECTOR_FLOAT2"] = 18] = "VECTOR_FLOAT2";
	    ValueType[ValueType["VECTOR_INT3"] = 19] = "VECTOR_INT3";
	    ValueType[ValueType["VECTOR_UINT3"] = 20] = "VECTOR_UINT3";
	    ValueType[ValueType["VECTOR_FLOAT3"] = 21] = "VECTOR_FLOAT3";
	    ValueType[ValueType["VECTOR_INT4"] = 22] = "VECTOR_INT4";
	    ValueType[ValueType["VECTOR_UINT4"] = 23] = "VECTOR_UINT4";
	    ValueType[ValueType["VECTOR_FLOAT4"] = 24] = "VECTOR_FLOAT4";
	    ValueType[ValueType["BLOB"] = 25] = "BLOB";
	    ValueType[ValueType["BOOL"] = 26] = "BOOL";
	    ValueType[ValueType["VECTOR_BOOL"] = 36] = "VECTOR_BOOL";
	})(ValueType = exports.ValueType || (exports.ValueType = {}));

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.packedType = exports.fixedTypedVectorElementSize = exports.fixedTypedVectorElementType = exports.typedVectorElementType = exports.toTypedVector = exports.isAVector = exports.isFixedTypedVector = exports.isTypedVector = exports.isTypedVectorElement = exports.isIndirectNumber = exports.isNumber = exports.isInline = void 0;
	var value_type_1 = __webpack_require__(39);
	function isInline(value) {
	    return value === value_type_1.ValueType.BOOL || value <= value_type_1.ValueType.FLOAT;
	}
	exports.isInline = isInline;
	function isNumber(value) {
	    return value >= value_type_1.ValueType.INT && value <= value_type_1.ValueType.FLOAT;
	}
	exports.isNumber = isNumber;
	function isIndirectNumber(value) {
	    return value >= value_type_1.ValueType.INDIRECT_INT && value <= value_type_1.ValueType.INDIRECT_FLOAT;
	}
	exports.isIndirectNumber = isIndirectNumber;
	function isTypedVectorElement(value) {
	    return value === value_type_1.ValueType.BOOL || value >= value_type_1.ValueType.INT && value <= value_type_1.ValueType.STRING;
	}
	exports.isTypedVectorElement = isTypedVectorElement;
	function isTypedVector(value) {
	    return value === value_type_1.ValueType.VECTOR_BOOL || value >= value_type_1.ValueType.VECTOR_INT && value <= value_type_1.ValueType.VECTOR_STRING_DEPRECATED;
	}
	exports.isTypedVector = isTypedVector;
	function isFixedTypedVector(value) {
	    return value >= value_type_1.ValueType.VECTOR_INT2 && value <= value_type_1.ValueType.VECTOR_FLOAT4;
	}
	exports.isFixedTypedVector = isFixedTypedVector;
	function isAVector(value) {
	    return isTypedVector(value) || isFixedTypedVector(value) || value === value_type_1.ValueType.VECTOR;
	}
	exports.isAVector = isAVector;
	function toTypedVector(valueType, length) {
	    if (length === 0) return valueType - value_type_1.ValueType.INT + value_type_1.ValueType.VECTOR_INT;
	    if (length === 2) return valueType - value_type_1.ValueType.INT + value_type_1.ValueType.VECTOR_INT2;
	    if (length === 3) return valueType - value_type_1.ValueType.INT + value_type_1.ValueType.VECTOR_INT3;
	    if (length === 4) return valueType - value_type_1.ValueType.INT + value_type_1.ValueType.VECTOR_INT4;
	    throw "Unexpected length " + length;
	}
	exports.toTypedVector = toTypedVector;
	function typedVectorElementType(valueType) {
	    return valueType - value_type_1.ValueType.VECTOR_INT + value_type_1.ValueType.INT;
	}
	exports.typedVectorElementType = typedVectorElementType;
	function fixedTypedVectorElementType(valueType) {
	    return (valueType - value_type_1.ValueType.VECTOR_INT2) % 3 + value_type_1.ValueType.INT;
	}
	exports.fixedTypedVectorElementType = fixedTypedVectorElementType;
	function fixedTypedVectorElementSize(valueType) {
	    // The x / y >> 0 trick is to have an int division. Suppose to be faster than Math.floor()
	    return ((valueType - value_type_1.ValueType.VECTOR_INT2) / 3 >> 0) + 2;
	}
	exports.fixedTypedVectorElementSize = fixedTypedVectorElementSize;
	function packedType(valueType, bitWidth) {
	    return bitWidth | valueType << 2;
	}
	exports.packedType = packedType;

/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.StackValue = void 0;
	var bit_width_1 = __webpack_require__(36);
	var bit_width_util_1 = __webpack_require__(37);
	var value_type_1 = __webpack_require__(39);
	var value_type_util_1 = __webpack_require__(40);
	var StackValue = /** @class */function () {
	    function StackValue(builder, type, width, value, offset) {
	        if (value === void 0) {
	            value = null;
	        }
	        if (offset === void 0) {
	            offset = 0;
	        }
	        this.builder = builder;
	        this.type = type;
	        this.width = width;
	        this.value = value;
	        this.offset = offset;
	    }
	    StackValue.prototype.elementWidth = function (size, index) {
	        if ((0, value_type_util_1.isInline)(this.type)) return this.width;
	        for (var i = 0; i < 4; i++) {
	            var width = 1 << i;
	            var offsetLoc = size + (0, bit_width_util_1.paddingSize)(size, width) + index * width;
	            var offset = offsetLoc - this.offset;
	            var bitWidth = (0, bit_width_util_1.uwidth)(offset);
	            if (1 << bitWidth === width) {
	                return bitWidth;
	            }
	        }
	        throw "Element is unknown. Size: ".concat(size, " at index: ").concat(index, ". This might be a bug. Please create an issue https://github.com/google/flatbuffers/issues/new");
	    };
	    StackValue.prototype.writeToBuffer = function (byteWidth) {
	        var newOffset = this.builder.computeOffset(byteWidth);
	        if (this.type === value_type_1.ValueType.FLOAT) {
	            if (this.width === bit_width_1.BitWidth.WIDTH32) {
	                this.builder.view.setFloat32(this.builder.offset, this.value, true);
	            } else {
	                this.builder.view.setFloat64(this.builder.offset, this.value, true);
	            }
	        } else if (this.type === value_type_1.ValueType.INT) {
	            var bitWidth = (0, bit_width_util_1.fromByteWidth)(byteWidth);
	            this.builder.pushInt(this.value, bitWidth);
	        } else if (this.type === value_type_1.ValueType.UINT) {
	            var bitWidth = (0, bit_width_util_1.fromByteWidth)(byteWidth);
	            this.builder.pushUInt(this.value, bitWidth);
	        } else if (this.type === value_type_1.ValueType.NULL) {
	            this.builder.pushInt(0, this.width);
	        } else if (this.type === value_type_1.ValueType.BOOL) {
	            this.builder.pushInt(this.value ? 1 : 0, this.width);
	        } else {
	            throw "Unexpected type: ".concat(this.type, ". This might be a bug. Please create an issue https://github.com/google/flatbuffers/issues/new");
	        }
	        this.offset = newOffset;
	    };
	    StackValue.prototype.storedWidth = function (width) {
	        if (width === void 0) {
	            width = bit_width_1.BitWidth.WIDTH8;
	        }
	        return (0, value_type_util_1.isInline)(this.type) ? Math.max(width, this.width) : this.width;
	    };
	    StackValue.prototype.storedPackedType = function (width) {
	        if (width === void 0) {
	            width = bit_width_1.BitWidth.WIDTH8;
	        }
	        return (0, value_type_util_1.packedType)(this.type, this.storedWidth(width));
	    };
	    StackValue.prototype.isOffset = function () {
	        return !(0, value_type_util_1.isInline)(this.type);
	    };
	    return StackValue;
	}();
	exports.StackValue = StackValue;

/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Reference = exports.toReference = void 0;
	var bit_width_util_1 = __webpack_require__(37);
	var value_type_1 = __webpack_require__(39);
	var value_type_util_1 = __webpack_require__(40);
	var reference_util_1 = __webpack_require__(43);
	var flexbuffers_util_1 = __webpack_require__(38);
	var bit_width_1 = __webpack_require__(36);
	function toReference(buffer) {
	    var len = buffer.byteLength;
	    if (len < 3) {
	        throw "Buffer needs to be bigger than 3";
	    }
	    var dataView = new DataView(buffer);
	    var byteWidth = dataView.getUint8(len - 1);
	    var packedType = dataView.getUint8(len - 2);
	    var parentWidth = (0, bit_width_util_1.fromByteWidth)(byteWidth);
	    var offset = len - byteWidth - 2;
	    return new Reference(dataView, offset, parentWidth, packedType, "/");
	}
	exports.toReference = toReference;
	var Reference = /** @class */function () {
	    function Reference(dataView, offset, parentWidth, packedType, path) {
	        this.dataView = dataView;
	        this.offset = offset;
	        this.parentWidth = parentWidth;
	        this.packedType = packedType;
	        this.path = path;
	        this._length = -1;
	        this.byteWidth = 1 << (packedType & 3);
	        this.valueType = packedType >> 2;
	    }
	    Reference.prototype.isNull = function () {
	        return this.valueType === value_type_1.ValueType.NULL;
	    };
	    Reference.prototype.isNumber = function () {
	        return (0, value_type_util_1.isNumber)(this.valueType) || (0, value_type_util_1.isIndirectNumber)(this.valueType);
	    };
	    Reference.prototype.isFloat = function () {
	        return value_type_1.ValueType.FLOAT === this.valueType || value_type_1.ValueType.INDIRECT_FLOAT === this.valueType;
	    };
	    Reference.prototype.isInt = function () {
	        return this.isNumber() && !this.isFloat();
	    };
	    Reference.prototype.isString = function () {
	        return value_type_1.ValueType.STRING === this.valueType || value_type_1.ValueType.KEY === this.valueType;
	    };
	    Reference.prototype.isBool = function () {
	        return value_type_1.ValueType.BOOL === this.valueType;
	    };
	    Reference.prototype.isBlob = function () {
	        return value_type_1.ValueType.BLOB === this.valueType;
	    };
	    Reference.prototype.isVector = function () {
	        return (0, value_type_util_1.isAVector)(this.valueType);
	    };
	    Reference.prototype.isMap = function () {
	        return value_type_1.ValueType.MAP === this.valueType;
	    };
	    Reference.prototype.boolValue = function () {
	        if (this.isBool()) {
	            return (0, reference_util_1.readInt)(this.dataView, this.offset, this.parentWidth) > 0;
	        }
	        return null;
	    };
	    Reference.prototype.intValue = function () {
	        if (this.valueType === value_type_1.ValueType.INT) {
	            return (0, reference_util_1.readInt)(this.dataView, this.offset, this.parentWidth);
	        }
	        if (this.valueType === value_type_1.ValueType.UINT) {
	            return (0, reference_util_1.readUInt)(this.dataView, this.offset, this.parentWidth);
	        }
	        if (this.valueType === value_type_1.ValueType.INDIRECT_INT) {
	            return (0, reference_util_1.readInt)(this.dataView, (0, reference_util_1.indirect)(this.dataView, this.offset, this.parentWidth), (0, bit_width_util_1.fromByteWidth)(this.byteWidth));
	        }
	        if (this.valueType === value_type_1.ValueType.INDIRECT_UINT) {
	            return (0, reference_util_1.readUInt)(this.dataView, (0, reference_util_1.indirect)(this.dataView, this.offset, this.parentWidth), (0, bit_width_util_1.fromByteWidth)(this.byteWidth));
	        }
	        return null;
	    };
	    Reference.prototype.floatValue = function () {
	        if (this.valueType === value_type_1.ValueType.FLOAT) {
	            return (0, reference_util_1.readFloat)(this.dataView, this.offset, this.parentWidth);
	        }
	        if (this.valueType === value_type_1.ValueType.INDIRECT_FLOAT) {
	            return (0, reference_util_1.readFloat)(this.dataView, (0, reference_util_1.indirect)(this.dataView, this.offset, this.parentWidth), (0, bit_width_util_1.fromByteWidth)(this.byteWidth));
	        }
	        return null;
	    };
	    Reference.prototype.numericValue = function () {
	        return this.floatValue() || this.intValue();
	    };
	    Reference.prototype.stringValue = function () {
	        if (this.valueType === value_type_1.ValueType.STRING || this.valueType === value_type_1.ValueType.KEY) {
	            var begin = (0, reference_util_1.indirect)(this.dataView, this.offset, this.parentWidth);
	            return (0, flexbuffers_util_1.fromUTF8Array)(new Uint8Array(this.dataView.buffer, this.dataView.byteOffset + begin, this.length()));
	        }
	        return null;
	    };
	    Reference.prototype.blobValue = function () {
	        if (this.isBlob()) {
	            var begin = (0, reference_util_1.indirect)(this.dataView, this.offset, this.parentWidth);
	            return new Uint8Array(this.dataView.buffer, this.dataView.byteOffset + begin, this.length());
	        }
	        return null;
	    };
	    Reference.prototype.get = function (key) {
	        var length = this.length();
	        if (Number.isInteger(key) && (0, value_type_util_1.isAVector)(this.valueType)) {
	            if (key >= length || key < 0) {
	                throw "Key: [".concat(key, "] is not applicable on ").concat(this.path, " of ").concat(this.valueType, " length: ").concat(length);
	            }
	            var _indirect = (0, reference_util_1.indirect)(this.dataView, this.offset, this.parentWidth);
	            var elementOffset = _indirect + key * this.byteWidth;
	            var _packedType = this.dataView.getUint8(_indirect + length * this.byteWidth + key);
	            if ((0, value_type_util_1.isTypedVector)(this.valueType)) {
	                var _valueType = (0, value_type_util_1.typedVectorElementType)(this.valueType);
	                _packedType = (0, value_type_util_1.packedType)(_valueType, bit_width_1.BitWidth.WIDTH8);
	            } else if ((0, value_type_util_1.isFixedTypedVector)(this.valueType)) {
	                var _valueType = (0, value_type_util_1.fixedTypedVectorElementType)(this.valueType);
	                _packedType = (0, value_type_util_1.packedType)(_valueType, bit_width_1.BitWidth.WIDTH8);
	            }
	            return new Reference(this.dataView, elementOffset, (0, bit_width_util_1.fromByteWidth)(this.byteWidth), _packedType, "".concat(this.path, "[").concat(key, "]"));
	        }
	        if (typeof key === 'string') {
	            var index = (0, reference_util_1.keyIndex)(key, this.dataView, this.offset, this.parentWidth, this.byteWidth, length);
	            if (index !== null) {
	                return (0, reference_util_1.valueForIndexWithKey)(index, key, this.dataView, this.offset, this.parentWidth, this.byteWidth, length, this.path);
	            }
	        }
	        throw "Key [".concat(key, "] is not applicable on ").concat(this.path, " of ").concat(this.valueType);
	    };
	    Reference.prototype.length = function () {
	        var size;
	        if (this._length > -1) {
	            return this._length;
	        }
	        if ((0, value_type_util_1.isFixedTypedVector)(this.valueType)) {
	            this._length = (0, value_type_util_1.fixedTypedVectorElementSize)(this.valueType);
	        } else if (this.valueType === value_type_1.ValueType.BLOB || this.valueType === value_type_1.ValueType.MAP || (0, value_type_util_1.isAVector)(this.valueType)) {
	            this._length = Number((0, reference_util_1.readUInt)(this.dataView, (0, reference_util_1.indirect)(this.dataView, this.offset, this.parentWidth) - this.byteWidth, (0, bit_width_util_1.fromByteWidth)(this.byteWidth)));
	        } else if (this.valueType === value_type_1.ValueType.NULL) {
	            this._length = 0;
	        } else if (this.valueType === value_type_1.ValueType.STRING) {
	            var _indirect = (0, reference_util_1.indirect)(this.dataView, this.offset, this.parentWidth);
	            var sizeByteWidth = this.byteWidth;
	            size = (0, reference_util_1.readUInt)(this.dataView, _indirect - sizeByteWidth, (0, bit_width_util_1.fromByteWidth)(this.byteWidth));
	            while (this.dataView.getInt8(_indirect + size) !== 0) {
	                sizeByteWidth <<= 1;
	                size = (0, reference_util_1.readUInt)(this.dataView, _indirect - sizeByteWidth, (0, bit_width_util_1.fromByteWidth)(this.byteWidth));
	            }
	            this._length = size;
	        } else if (this.valueType === value_type_1.ValueType.KEY) {
	            var _indirect = (0, reference_util_1.indirect)(this.dataView, this.offset, this.parentWidth);
	            size = 1;
	            while (this.dataView.getInt8(_indirect + size) !== 0) {
	                size++;
	            }
	            this._length = size;
	        } else {
	            this._length = 1;
	        }
	        return this._length;
	    };
	    Reference.prototype.toObject = function () {
	        var length = this.length();
	        if (this.isVector()) {
	            var result = [];
	            for (var i = 0; i < length; i++) {
	                result.push(this.get(i).toObject());
	            }
	            return result;
	        }
	        if (this.isMap()) {
	            var result = {};
	            for (var i = 0; i < length; i++) {
	                var key = (0, reference_util_1.keyForIndex)(i, this.dataView, this.offset, this.parentWidth, this.byteWidth);
	                result[key] = (0, reference_util_1.valueForIndexWithKey)(i, key, this.dataView, this.offset, this.parentWidth, this.byteWidth, length, this.path).toObject();
	            }
	            return result;
	        }
	        if (this.isNull()) {
	            return null;
	        }
	        if (this.isBool()) {
	            return this.boolValue();
	        }
	        if (this.isNumber()) {
	            return this.numericValue();
	        }
	        return this.blobValue() || this.stringValue();
	    };
	    return Reference;
	}();
	exports.Reference = Reference;

/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.keyForIndex = exports.valueForIndexWithKey = exports.diffKeys = exports.keyIndex = exports.indirect = exports.readFloat = exports.readUInt = exports.readInt = exports.validateOffset = void 0;
	var bit_width_1 = __webpack_require__(36);
	var bit_width_util_1 = __webpack_require__(37);
	var flexbuffers_util_1 = __webpack_require__(38);
	var reference_1 = __webpack_require__(42);
	var long_1 = __webpack_require__(12);
	function validateOffset(dataView, offset, width) {
	    if (dataView.byteLength <= offset + width || (offset & (0, bit_width_util_1.toByteWidth)(width) - 1) !== 0) {
	        throw "Bad offset: " + offset + ", width: " + width;
	    }
	}
	exports.validateOffset = validateOffset;
	function readInt(dataView, offset, width) {
	    if (width < 2) {
	        if (width < 1) {
	            return dataView.getInt8(offset);
	        } else {
	            return dataView.getInt16(offset, true);
	        }
	    } else {
	        if (width < 3) {
	            return dataView.getInt32(offset, true);
	        } else {
	            if (dataView.setBigInt64 === undefined) {
	                return new long_1.Long(dataView.getUint32(offset, true), dataView.getUint32(offset + 4, true));
	            }
	            return dataView.getBigInt64(offset, true);
	        }
	    }
	}
	exports.readInt = readInt;
	function readUInt(dataView, offset, width) {
	    if (width < 2) {
	        if (width < 1) {
	            return dataView.getUint8(offset);
	        } else {
	            return dataView.getUint16(offset, true);
	        }
	    } else {
	        if (width < 3) {
	            return dataView.getUint32(offset, true);
	        } else {
	            if (dataView.getBigUint64 === undefined) {
	                return new long_1.Long(dataView.getUint32(offset, true), dataView.getUint32(offset + 4, true));
	            }
	            return dataView.getBigUint64(offset, true);
	        }
	    }
	}
	exports.readUInt = readUInt;
	function readFloat(dataView, offset, width) {
	    if (width < bit_width_1.BitWidth.WIDTH32) {
	        throw "Bad width: " + width;
	    }
	    if (width === bit_width_1.BitWidth.WIDTH32) {
	        return dataView.getFloat32(offset, true);
	    }
	    return dataView.getFloat64(offset, true);
	}
	exports.readFloat = readFloat;
	function indirect(dataView, offset, width) {
	    var step = Number(readUInt(dataView, offset, width));
	    return offset - step;
	}
	exports.indirect = indirect;
	function keyIndex(key, dataView, offset, parentWidth, byteWidth, length) {
	    var input = (0, flexbuffers_util_1.toUTF8Array)(key);
	    var keysVectorOffset = indirect(dataView, offset, parentWidth) - byteWidth * 3;
	    var bitWidth = (0, bit_width_util_1.fromByteWidth)(byteWidth);
	    var indirectOffset = keysVectorOffset - Number(readUInt(dataView, keysVectorOffset, bitWidth));
	    var _byteWidth = Number(readUInt(dataView, keysVectorOffset + byteWidth, bitWidth));
	    var low = 0;
	    var high = length - 1;
	    while (low <= high) {
	        var mid = high + low >> 1;
	        var dif = diffKeys(input, mid, dataView, indirectOffset, _byteWidth);
	        if (dif === 0) return mid;
	        if (dif < 0) {
	            high = mid - 1;
	        } else {
	            low = mid + 1;
	        }
	    }
	    return null;
	}
	exports.keyIndex = keyIndex;
	function diffKeys(input, index, dataView, offset, width) {
	    var keyOffset = offset + index * width;
	    var keyIndirectOffset = keyOffset - Number(readUInt(dataView, keyOffset, (0, bit_width_util_1.fromByteWidth)(width)));
	    for (var i = 0; i < input.length; i++) {
	        var dif = input[i] - dataView.getUint8(keyIndirectOffset + i);
	        if (dif !== 0) {
	            return dif;
	        }
	    }
	    return dataView.getUint8(keyIndirectOffset + input.length) === 0 ? 0 : -1;
	}
	exports.diffKeys = diffKeys;
	function valueForIndexWithKey(index, key, dataView, offset, parentWidth, byteWidth, length, path) {
	    var _indirect = indirect(dataView, offset, parentWidth);
	    var elementOffset = _indirect + index * byteWidth;
	    var packedType = dataView.getUint8(_indirect + length * byteWidth + index);
	    return new reference_1.Reference(dataView, elementOffset, (0, bit_width_util_1.fromByteWidth)(byteWidth), packedType, "".concat(path, "/").concat(key));
	}
	exports.valueForIndexWithKey = valueForIndexWithKey;
	function keyForIndex(index, dataView, offset, parentWidth, byteWidth) {
	    var keysVectorOffset = indirect(dataView, offset, parentWidth) - byteWidth * 3;
	    var bitWidth = (0, bit_width_util_1.fromByteWidth)(byteWidth);
	    var indirectOffset = keysVectorOffset - Number(readUInt(dataView, keysVectorOffset, bitWidth));
	    var _byteWidth = readUInt(dataView, keysVectorOffset + byteWidth, bitWidth);
	    var keyOffset = indirectOffset + index * _byteWidth;
	    var keyIndirectOffset = keyOffset - Number(readUInt(dataView, keyOffset, (0, bit_width_util_1.fromByteWidth)(_byteWidth)));
	    var length = 0;
	    while (dataView.getUint8(keyIndirectOffset + length) !== 0) {
	        length++;
	    }
	    return (0, flexbuffers_util_1.fromUTF8Array)(new Uint8Array(dataView.buffer, dataView.byteOffset + keyIndirectOffset, length));
	}
	exports.keyForIndex = keyForIndex;

/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var flexbuffers = __webpack_require__(34);

	var _require = __webpack_require__(37),
	    fromByteWidth = _require.fromByteWidth;

	var _require2 = __webpack_require__(40),
	    isNumber = _require2.isNumber,
	    isIndirectNumber = _require2.isIndirectNumber,
	    isAVector = _require2.isAVector,
	    fixedTypedVectorElementSize = _require2.fixedTypedVectorElementSize,
	    isFixedTypedVector = _require2.isFixedTypedVector,
	    isTypedVector = _require2.isTypedVector,
	    typedVectorElementType = _require2.typedVectorElementType,
	    packedType = _require2.packedType,
	    fixedTypedVectorElementType = _require2.fixedTypedVectorElementType;

	var _require3 = __webpack_require__(43),
	    indirect = _require3.indirect,
	    keyForIndex = _require3.keyForIndex,
	    keyIndex = _require3.keyIndex,
	    readFloat = _require3.readFloat,
	    readInt = _require3.readInt,
	    readUInt = _require3.readUInt,
	    valueForIndexWithKey = _require3.valueForIndexWithKey;

	var _require4 = __webpack_require__(36),
	    BitWidth = _require4.BitWidth;

	var tmpRef = new flexbuffers.toReference(new ArrayBuffer(4));
	var tmpRef2 = new flexbuffers.toReference(new ArrayBuffer(4));

	var refReset = function refReset(ref, buffer) {
	  var len = buffer.byteLength;

	  if (ref.dataView.buffer !== buffer) {
	    ref.dataView = new DataView(buffer);
	  }

	  var byteWidth = ref.dataView.getUint8(len - 1);
	  ref.packedType = ref.dataView.getUint8(len - 2);
	  ref.parentWidth = fromByteWidth(byteWidth);
	  ref.offset = len - byteWidth - 2;
	  ref.byteWidth = 1 << (ref.packedType & 3);
	  ref.valueType = ref.packedType >> 2;
	  ref._length = -1;
	};

	var refAdvanceToIndexGet = function refAdvanceToIndexGet(ref, index) {
	  var length = ref.length();
	  var _indirect = indirect(ref.dataView, ref.offset, ref.parentWidth);
	  var elementOffset = _indirect + index * ref.byteWidth;
	  var _packedType = ref.dataView.getUint8(_indirect + length * ref.byteWidth + index);
	  if (isTypedVector(ref.valueType)) {
	    var _valueType = typedVectorElementType(ref.valueType);
	    _packedType = packedType(_valueType, BitWidth.WIDTH8);
	  } else if (isFixedTypedVector(ref.valueType)) {
	    var _valueType2 = fixedTypedVectorElementType(ref.valueType);
	    _packedType = packedType(_valueType2, BitWidth.WIDTH8);
	  }
	  ref.offset = elementOffset;
	  ref.parentWidth = fromByteWidth(ref.byteWidth);
	  ref.packedType = _packedType;
	  ref.byteWidth = 1 << (ref.packedType & 3);
	  ref.valueType = ref.packedType >> 2;
	  ref._length = -1;
	};

	var refCp = function refCp(ref1, ref2) {
	  ref2.dataView = ref1.dataView;
	  ref2.packedType = ref1.packedType;
	  ref2.parentWidth = ref1.parentWidth;
	  ref2.offset = ref1.offset;
	  ref2.byteWidth = ref1.byteWidth;
	  ref2.valueType = ref1.valueType;
	  ref2.length(); // Side effect to reduce length computes
	  ref2._length = ref1._length;
	};

	var refGetBool = function refGetBool(ref, key) {
	  refCp(ref, tmpRef);
	  refAdvanceToIndexGet(tmpRef, key);
	  return tmpRef.boolValue();
	};

	var refGetInt = function refGetInt(ref, key) {
	  refCp(ref, tmpRef);
	  refAdvanceToIndexGet(tmpRef, key);
	  return Number(tmpRef.intValue());
	};

	var refGetNumeric = function refGetNumeric(ref, key) {
	  refCp(ref, tmpRef);
	  refAdvanceToIndexGet(tmpRef, key);
	  return Number(tmpRef.numericValue());
	};

	var refGetString = function refGetString(ref, key) {
	  refCp(ref, tmpRef);
	  refAdvanceToIndexGet(tmpRef, key);
	  return tmpRef.stringValue();
	};

	var refGetToObject = function refGetToObject(ref, key) {
	  refCp(ref, tmpRef);
	  refAdvanceToIndexGet(tmpRef, key);
	  return tmpRef.toObject();
	};

	var refGetUuidBytes = function refGetUuidBytes(ref, key) {
	  var target = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

	  target.length = 16;
	  refCp(ref, tmpRef2);
	  refAdvanceToIndexGet(tmpRef2, key);

	  for (var i = 0; i < 16; i++) {
	    target[i] = Number(refGetInt(tmpRef2, i));
	  }

	  return target;
	};

	module.exports = { refReset: refReset, refAdvanceToIndexGet: refAdvanceToIndexGet, refGetBool: refGetBool, refGetInt: refGetInt, refGetNumeric: refGetNumeric, refGetString: refGetString, refGetUuidBytes: refGetUuidBytes, refCp: refCp, refGetToObject: refGetToObject };

/***/ }),
/* 45 */
/***/ (function(module, exports) {

	// Patched version of fast-deep-equal which does not
	// allocate memory via calling Object.keys
	//
	// https://github.com/epoberezkin/fast-deep-equal/blob/master/index.js
	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var isArray = Array.isArray;
	var keyList = Object.keys;
	var hasProp = Object.prototype.hasOwnProperty;

	module.exports = function equal(a, b) {
	  if (a === b) return true;

	  if (a && b && (typeof a === 'undefined' ? 'undefined' : _typeof(a)) == 'object' && (typeof b === 'undefined' ? 'undefined' : _typeof(b)) == 'object') {
	    var arrA = isArray(a),
	        arrB = isArray(b),
	        i,
	        length,
	        key;

	    if (arrA && arrB) {
	      length = a.length;
	      if (length != b.length) return false;
	      for (i = length; i-- !== 0;) {
	        if (!equal(a[i], b[i])) return false;
	      }return true;
	    }

	    if (arrA != arrB) return false;

	    var dateA = a instanceof Date,
	        dateB = b instanceof Date;
	    if (dateA != dateB) return false;
	    if (dateA && dateB) return a.getTime() == b.getTime();

	    var regexpA = a instanceof RegExp,
	        regexpB = b instanceof RegExp;
	    if (regexpA != regexpB) return false;
	    if (regexpA && regexpB) return a.toString() == b.toString();

	    var keys = keyList(a);
	    length = keys.length;

	    if (length !== keyList(b).length) return false;

	    for (i = length; i-- !== 0;) {
	      if (!hasProp.call(b, keys[i])) return false;
	    }for (i = length; i-- !== 0;) {
	      key = keys[i];
	      if (!equal(a[key], b[key])) return false;
	    }

	    return true;
	  }

	  return a !== a && b !== b;
	};

/***/ }),
/* 46 */
/***/ (function(module, exports) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/* global THREE */
	var LERP_FRAMES = 30;
	var TYPE_POSITION = 0x1;
	var TYPE_QUATERNION = 0x2;
	var TYPE_SCALE = 0x4;

	var tmpQuaternion = new THREE.Quaternion();
	var MAX_FINAL_FRAME_AWAIT_MS = 350;
	var EPSILON = 0.0001;

	// Performs lerp/slerp on frames

	var Lerper = function () {
	  function Lerper() {
	    var fps = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
	    var maxLerpDistance = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 100000.0;
	    var jitterTolerance = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 3.0;

	    _classCallCheck(this, Lerper);

	    this.frames = [];
	    this.frameIndex = -1;
	    this.running = 0;
	    this.firstTypeFlags = 0;
	    this.maxLerpDistanceSq = maxLerpDistance * maxLerpDistance;

	    for (var i = 0; i < LERP_FRAMES; i++) {
	      // Frames are:
	      // time
	      // type flags
	      // pos x y z
	      // quat x y z w
	      // scale x y z
	      this.frames.push([0, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0]);
	    }

	    this.bufferTimeMs = 1000 / fps * jitterTolerance;
	  }

	  _createClass(Lerper, [{
	    key: "reset",
	    value: function reset() {
	      this.frameIndex = -1;
	      this.firstTypeFlags = 0;

	      for (var i = 0; i < this.frames.length; i++) {
	        this.frames[i][0] = 0;
	      }
	    }
	  }, {
	    key: "lerp",
	    value: function lerp(start, end, t) {
	      return start + (end - start) * t;
	    }
	  }, {
	    key: "startFrame",
	    value: function startFrame() {
	      this.frameIndex = (this.frameIndex + 1) % this.frames.length;

	      var frame = this.frames[this.frameIndex];
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
	  }, {
	    key: "setPosition",
	    value: function setPosition(x, y, z) {
	      var frame = this.frames[this.frameIndex];
	      this.running |= TYPE_POSITION;
	      frame[1] |= TYPE_POSITION;
	      frame[2] = x;
	      frame[3] = y;
	      frame[4] = z;
	    }
	  }, {
	    key: "setQuaternion",
	    value: function setQuaternion(x, y, z, w) {
	      var frame = this.frames[this.frameIndex];
	      this.running |= TYPE_QUATERNION;
	      frame[1] |= TYPE_QUATERNION;
	      frame[5] = x;
	      frame[6] = y;
	      frame[7] = z;
	      frame[8] = w;
	    }
	  }, {
	    key: "setScale",
	    value: function setScale(x, y, z) {
	      var frame = this.frames[this.frameIndex];
	      this.running |= TYPE_SCALE;
	      frame[1] |= TYPE_SCALE;
	      frame[9] = x;
	      frame[10] = y;
	      frame[11] = z;
	    }
	  }, {
	    key: "step",
	    value: function step(type, target) {
	      if ((this.running & type) === 0) return false;

	      var frames = this.frames;

	      if (this.frameIndex === -1) return false;

	      var serverTime = performance.now() - this.bufferTimeMs;
	      var olderFrame = void 0;
	      var newerFrame = void 0;

	      for (var i = frames.length; i >= 1; i--) {
	        var idx = (this.frameIndex + i) % this.frames.length;
	        var frame = frames[idx];

	        if (frame[0] !== 0 && frame[1] & type) {
	          if ((this.firstTypeFlags & type) === 0) {
	            this.firstTypeFlags |= type;

	            // First frame.

	            if (type === TYPE_POSITION) {
	              target.x = frame[2];
	              target.y = frame[3];
	              target.z = frame[4];
	            } else if (type === TYPE_QUATERNION) {
	              target.x = frame[5];
	              target.y = frame[6];
	              target.z = frame[7];
	              target.w = frame[8];
	            } else if (type === TYPE_SCALE) {
	              target.x = frame[9];
	              target.y = frame[10];
	              target.z = frame[11];
	            }

	            return true;
	          }

	          if (frame[0] <= serverTime) {
	            olderFrame = frame;

	            for (var j = 1; j < frames.length; j++) {
	              var nidx = (idx + j) % this.frames.length;
	              // Find the next frame that has this type (pos, rot, scale)
	              if (frames[nidx][1] & type && frames[nidx][0] !== 0 && frames[nidx][0] > olderFrame[0]) {
	                newerFrame = frames[nidx];
	                break;
	              }
	            }

	            break;
	          }
	        }
	      }

	      var isFinalFrame = olderFrame && !newerFrame && performance.now() - olderFrame[0] > MAX_FINAL_FRAME_AWAIT_MS;

	      if (!isFinalFrame && (!olderFrame || !newerFrame)) return false;

	      var pPercent = 1.0;

	      var px = target.x;
	      var py = target.y;
	      var pz = target.z;

	      if (!isFinalFrame) {
	        var t0 = newerFrame[0];
	        var t1 = olderFrame[0];

	        // THE TIMELINE
	        // t = time (serverTime)
	        // p = entity position
	        // ------ t1 ------ tn --- t0 ----->> NOW
	        // ------ p1 ------ pn --- p0 ----->> NOW
	        // ------ 0% ------ x% --- 100% --->> NOW
	        var zeroPercent = serverTime - t1;
	        var hundredPercent = t0 - t1;
	        pPercent = zeroPercent / hundredPercent;

	        if (type === TYPE_POSITION) {
	          var oX = olderFrame[2];
	          var oY = olderFrame[3];
	          var oZ = olderFrame[4];

	          var nX = newerFrame[2];
	          var nY = newerFrame[3];
	          var nZ = newerFrame[4];

	          var dx = oX - nX;
	          var dy = oY - nY;
	          var dz = oZ - nZ;

	          var distSq = dx * dx + dy * dy + dz * dz;

	          if (distSq >= this.maxLerpDistanceSq) {
	            target.x = nX;
	            target.y = nY;
	            target.z = nZ;
	          } else {
	            target.x = this.lerp(oX, nX, pPercent);
	            target.y = this.lerp(oY, nY, pPercent);
	            target.z = this.lerp(oZ, nZ, pPercent);
	          }

	          return Math.abs(px - target.x) > EPSILON || Math.abs(py - target.y) > EPSILON || Math.abs(pz - target.z) > EPSILON;
	        } else if (type === TYPE_QUATERNION) {
	          var pw = target.w;
	          target.x = olderFrame[5];
	          target.y = olderFrame[6];
	          target.z = olderFrame[7];
	          target.w = olderFrame[8];
	          tmpQuaternion.x = newerFrame[5];
	          tmpQuaternion.y = newerFrame[6];
	          tmpQuaternion.z = newerFrame[7];
	          tmpQuaternion.w = newerFrame[8];
	          target.slerp(tmpQuaternion, pPercent);
	          return Math.abs(px - target.x) > EPSILON || Math.abs(py - target.y) > EPSILON || Math.abs(pz - target.z) > EPSILON || Math.abs(pw - target.w) > EPSILON;
	        } else if (type === TYPE_SCALE) {
	          target.x = this.lerp(olderFrame[9], newerFrame[9], pPercent);
	          target.y = this.lerp(olderFrame[10], newerFrame[10], pPercent);
	          target.z = this.lerp(olderFrame[11], newerFrame[11], pPercent);
	          return Math.abs(px - target.x) > EPSILON || Math.abs(py - target.y) > EPSILON || Math.abs(pz - target.z) > EPSILON;
	        }
	      } else {
	        this.running &= ~type;

	        if (type === TYPE_POSITION) {
	          target.x = olderFrame[2];
	          target.y = olderFrame[3];
	          target.z = olderFrame[4];
	          return Math.abs(px - target.x) > EPSILON || Math.abs(py - target.y) > EPSILON || Math.abs(pz - target.z) > EPSILON;
	        } else if (type === TYPE_QUATERNION) {
	          var _pw = target.w;
	          target.x = olderFrame[5];
	          target.y = olderFrame[6];
	          target.z = olderFrame[7];
	          target.w = olderFrame[8];
	          return Math.abs(px - target.x) > EPSILON || Math.abs(py - target.y) > EPSILON || Math.abs(pz - target.z) > EPSILON || Math.abs(_pw - target.w) > EPSILON;
	        } else if (type === TYPE_SCALE) {
	          target.x = olderFrame[9];
	          target.y = olderFrame[10];
	          target.z = olderFrame[11];
	          return Math.abs(px - target.x) > EPSILON || Math.abs(py - target.y) > EPSILON || Math.abs(pz - target.z) > EPSILON;
	        }
	      }
	    }
	  }]);

	  return Lerper;
	}();

	module.exports = {
	  Lerper: Lerper,
	  TYPE_POSITION: TYPE_POSITION,
	  TYPE_QUATERNION: TYPE_QUATERNION,
	  TYPE_SCALE: TYPE_SCALE
	};

/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	/* global AFRAME, NAF, THREE */
	var naf = __webpack_require__(1);

	AFRAME.registerComponent('networked-audio-source', {
	  schema: {
	    positional: { default: true },
	    distanceModel: {
	      default: "inverse",
	      oneOf: ["linear", "inverse", "exponential"]
	    },
	    maxDistance: { default: 10000 },
	    refDistance: { default: 1 },
	    rolloffFactor: { default: 1 }
	  },

	  init: function init() {
	    var _this = this;

	    this.listener = null;
	    this.stream = null;

	    this._setMediaStream = this._setMediaStream.bind(this);

	    NAF.utils.getNetworkedEntity(this.el).then(function (networkedEl) {
	      var ownerId = networkedEl.components.networked.data.owner;

	      if (ownerId) {
	        NAF.connection.adapter.getMediaStream(ownerId).then(_this._setMediaStream).catch(function (e) {
	          return naf.log.error('Error getting media stream for ' + ownerId, e);
	        });
	      } else {
	        // Correctly configured local entity, perhaps do something here for enabling debug audio loopback
	      }
	    });
	  },

	  update: function update() {
	    this._setPannerProperties();
	  },
	  _setMediaStream: function _setMediaStream(newStream) {
	    if (!this.sound) {
	      this.setupSound();
	    }

	    if (newStream != this.stream) {
	      if (this.stream) {
	        this.sound.disconnect();
	      }
	      if (newStream) {
	        // Chrome seems to require a MediaStream be attached to an AudioElement before AudioNodes work correctly
	        // We don't want to do this in other browsers, particularly in Safari, which actually plays the audio despite
	        // setting the volume to 0.
	        if (/chrome/i.test(navigator.userAgent)) {
	          this.audioEl = new Audio();
	          this.audioEl.setAttribute("autoplay", "autoplay");
	          this.audioEl.setAttribute("playsinline", "playsinline");
	          this.audioEl.srcObject = newStream;
	          this.audioEl.volume = 0; // we don't actually want to hear audio from this element
	        }

	        var soundSource = this.sound.context.createMediaStreamSource(newStream);
	        this.sound.setNodeSource(soundSource);
	        this.el.emit('sound-source-set', { soundSource: soundSource });
	      }
	      this.stream = newStream;
	    }
	  },
	  _setPannerProperties: function _setPannerProperties() {
	    if (this.sound && this.data.positional) {
	      this.sound.setDistanceModel(this.data.distanceModel);
	      this.sound.setMaxDistance(this.data.maxDistance);
	      this.sound.setRefDistance(this.data.refDistance);
	      this.sound.setRolloffFactor(this.data.rolloffFactor);
	    }
	  },


	  remove: function remove() {
	    if (!this.sound) return;

	    this.el.removeObject3D(this.attrName);
	    if (this.stream) {
	      this.sound.disconnect();
	    }
	  },

	  setupSound: function setupSound() {
	    var el = this.el;
	    var sceneEl = el.sceneEl;

	    if (this.sound) {
	      el.removeObject3D(this.attrName);
	    }

	    if (!sceneEl.audioListener) {
	      sceneEl.audioListener = new THREE.AudioListener();
	      sceneEl.camera && sceneEl.camera.add(sceneEl.audioListener);
	      sceneEl.addEventListener('camera-set-active', function (evt) {
	        evt.detail.cameraEl.getObject3D('camera').add(sceneEl.audioListener);
	      });
	    }
	    this.listener = sceneEl.audioListener;

	    this.sound = this.data.positional ? new THREE.PositionalAudio(this.listener) : new THREE.Audio(this.listener);
	    el.setObject3D(this.attrName, this.sound);
	    this._setPannerProperties();
	  }
	});

/***/ })
/******/ ]);
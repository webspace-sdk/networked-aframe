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
	__webpack_require__(37);
	__webpack_require__(38);
	__webpack_require__(52);

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var options = __webpack_require__(2);
	var utils = __webpack_require__(3);
	var NafLogger = __webpack_require__(4);
	var Schemas = __webpack_require__(5);
	var NetworkEntities = __webpack_require__(6);
	var NetworkConnection = __webpack_require__(31);
	var AdapterFactory = __webpack_require__(36);

	var naf = {};
	naf.app = '';
	naf.room = '';
	naf.clientId = '';
	naf.options = options;
	naf.utils = utils;
	naf.log = new NafLogger();
	naf.schemas = new Schemas();
	naf.version = "0.6.1";

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
	      return reject("Entity does not have and is not a child of an entity with the [networked] component ");
	    }

	    if (curEntity.hasLoaded) {
	      resolve(curEntity);
	    } else {
	      curEntity.addEventListener("instantiated", function () {
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
	    throw new Error("Entity does not have and is not a child of an entity with the [networked] component ");
	  }

	  return curEntity.components.networked.takeOwnership();
	};

	module.exports.isMine = function (entity) {
	  var curEntity = entity;

	  while (curEntity && curEntity.components && !curEntity.components.networked) {
	    curEntity = curEntity.parentNode;
	  }

	  if (!curEntity || !curEntity.components || !curEntity.components.networked) {
	    throw new Error("Entity does not have and is not a child of an entity with the [networked] component ");
	  }

	  return curEntity.components.networked.data.owner === NAF.clientId;
	};

	module.exports.almostEqualVec3 = function (u, v, epsilon) {
	  return Math.abs(u.x - v.x) < epsilon && Math.abs(u.y - v.y) < epsilon && Math.abs(u.z - v.z) < epsilon;
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
	      if (this.validateSchema(schema)) {
	        this.schemaDict[schema.template] = schema;
	        var templateEl = document.querySelector(schema.template);
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

	/* global NAF */
	var ChildEntityCache = __webpack_require__(7);
	var uuid = __webpack_require__(8);
	var FBFullUpdateData = __webpack_require__(23).FullUpdateData;

	var fullUpdateDataRef = new FBFullUpdateData();
	var uuidByteBuf = [];
	uuidByteBuf.length = 16;

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

	      this.registerEntity(networkId, el);

	      return el;
	    }
	  }, {
	    key: 'addNetworkComponent',
	    value: function addNetworkComponent(entity, updateRef) {
	      var networkId = updateRef.networkId();
	      var fullUpdateData = updateRef.fullUpdateData(fullUpdateDataRef);

	      for (var i = 0; i < 16; i++) {
	        uuidByteBuf[i] = updateRef.owner(i);
	      }

	      var owner = uuid.stringify(uuidByteBuf);

	      for (var _i = 0; _i < 16; _i++) {
	        uuidByteBuf[_i] = fullUpdateData.creator(_i);
	      }

	      var creator = uuid.stringify(uuidByteBuf);
	      var template = fullUpdateData.template();
	      var persistent = fullUpdateData.persistent();

	      entity.setAttribute('networked', { template: template, owner: owner, creator: creator, networkId: networkId, persistent: persistent });

	      entity.firstUpdateRef = updateRef;
	    }
	  }, {
	    key: 'updateEntity',
	    value: function updateEntity(updateRef, source, sender) {
	      if (NAF.options.syncSource && source !== NAF.options.syncSource) return;

	      var isFullSync = updateRef.fullUpdateData(fullUpdateDataRef) != null;
	      var networkId = updateRef.networkId();

	      for (var i = 0; i < 16; i++) {
	        uuidByteBuf[i] = updateRef.owner(i);
	      }

	      var owner = uuid.stringify(uuidByteBuf);

	      if (this.hasEntity(networkId)) {
	        var entity = this.entities[networkId];
	        entity.components.networked.networkUpdate(updateRef, sender);
	      } else if (isFullSync && NAF.connection.activeDataChannels[owner] !== false) {
	        if (NAF.options.firstSyncSource && source !== NAF.options.firstSyncSource) {
	          NAF.log.write('Ignoring first sync from disallowed source', source);
	        } else {
	          if (NAF.connection.adapter.authorizeCreateEntity(fullUpdateDataRef.template(), sender)) {
	            if (fullUpdateDataRef.persistent()) {
	              // If we receive a firstSync for a persistent entity that we don't have yet,
	              // we assume the scene will create it at some point, so stash the update for later use.
	              // Make a copy since above we were using tempRef
	              this._persistentFirstSyncs[networkId] = updateRef;
	            } else {
	              this.receiveFirstUpdateFromEntity(updateRef, fullUpdateDataRef);
	            }
	          }
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
	      var scene = document.querySelector('a-scene');
	      scene.appendChild(el);
	    }
	  }, {
	    key: 'completeSync',
	    value: function completeSync(targetClientId, isFirstSync) {
	      for (var id in this.entities) {
	        if (this.entities.hasOwnProperty(id)) {
	          this.entities[id].components.networked.syncAll(targetClientId, isFirstSync);
	        }
	      }
	    }
	  }, {
	    key: 'removeRemoteEntity',
	    value: function removeRemoteEntity(deleteRef, source, sender) {
	      if (NAF.options.syncSource && source !== NAF.options.syncSource) return;

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
	      this.forgetPersistentFirstSync(id);

	      if (this.hasEntity(id)) {
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
	      } else {
	        NAF.log.error("Tried to remove entity I don't have.");
	        return null;
	      }
	    }
	  }, {
	    key: 'forgetEntity',
	    value: function forgetEntity(id) {
	      delete this.entities[id];
	      this.forgetPersistentFirstSync(id);
	    }
	  }, {
	    key: 'getPersistentFirstSync',
	    value: function getPersistentFirstSync(id) {
	      return this._persistentFirstSyncs[id];
	    }
	  }, {
	    key: 'forgetPersistentFirstSync',
	    value: function forgetPersistentFirstSync(id) {
	      delete this._persistentFirstSyncs[id];
	    }
	  }, {
	    key: 'getEntity',
	    value: function getEntity(id) {
	      if (this.entities.hasOwnProperty(id)) {
	        return this.entities[id];
	      }
	      return null;
	    }
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

	        if (includeOwned || owner != NAF.clientId) {
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

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	Object.defineProperty(exports, "v1", {
	  enumerable: true,
	  get: function get() {
	    return _v.default;
	  }
	});
	Object.defineProperty(exports, "v3", {
	  enumerable: true,
	  get: function get() {
	    return _v2.default;
	  }
	});
	Object.defineProperty(exports, "v4", {
	  enumerable: true,
	  get: function get() {
	    return _v3.default;
	  }
	});
	Object.defineProperty(exports, "v5", {
	  enumerable: true,
	  get: function get() {
	    return _v4.default;
	  }
	});
	Object.defineProperty(exports, "NIL", {
	  enumerable: true,
	  get: function get() {
	    return _nil.default;
	  }
	});
	Object.defineProperty(exports, "version", {
	  enumerable: true,
	  get: function get() {
	    return _version.default;
	  }
	});
	Object.defineProperty(exports, "validate", {
	  enumerable: true,
	  get: function get() {
	    return _validate.default;
	  }
	});
	Object.defineProperty(exports, "stringify", {
	  enumerable: true,
	  get: function get() {
	    return _stringify.default;
	  }
	});
	Object.defineProperty(exports, "parse", {
	  enumerable: true,
	  get: function get() {
	    return _parse.default;
	  }
	});

	var _v = _interopRequireDefault(__webpack_require__(9));

	var _v2 = _interopRequireDefault(__webpack_require__(14));

	var _v3 = _interopRequireDefault(__webpack_require__(18));

	var _v4 = _interopRequireDefault(__webpack_require__(19));

	var _nil = _interopRequireDefault(__webpack_require__(21));

	var _version = _interopRequireDefault(__webpack_require__(22));

	var _validate = _interopRequireDefault(__webpack_require__(12));

	var _stringify = _interopRequireDefault(__webpack_require__(11));

	var _parse = _interopRequireDefault(__webpack_require__(16));

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { default: obj };
	}

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = void 0;

	var _rng = _interopRequireDefault(__webpack_require__(10));

	var _stringify = _interopRequireDefault(__webpack_require__(11));

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { default: obj };
	}

	// **`v1()` - Generate time-based UUID**
	//
	// Inspired by https://github.com/LiosK/UUID.js
	// and http://docs.python.org/library/uuid.html
	var _nodeId = void 0;

	var _clockseq = void 0; // Previous uuid creation time


	var _lastMSecs = 0;
	var _lastNSecs = 0; // See https://github.com/uuidjs/uuid for API details

	function v1(options, buf, offset) {
	  var i = buf && offset || 0;
	  var b = buf || new Array(16);
	  options = options || {};
	  var node = options.node || _nodeId;
	  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq; // node and clockseq need to be initialized to random values if they're not
	  // specified.  We do this lazily to minimize issues related to insufficient
	  // system entropy.  See #189

	  if (node == null || clockseq == null) {
	    var seedBytes = options.random || (options.rng || _rng.default)();

	    if (node == null) {
	      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
	      node = _nodeId = [seedBytes[0] | 0x01, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
	    }

	    if (clockseq == null) {
	      // Per 4.2.2, randomize (14 bit) clockseq
	      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
	    }
	  } // UUID timestamps are 100 nano-second units since the Gregorian epoch,
	  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
	  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
	  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.


	  var msecs = options.msecs !== undefined ? options.msecs : Date.now(); // Per 4.2.1.2, use count of uuid's generated during the current clock
	  // cycle to simulate higher resolution clock

	  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1; // Time since last uuid creation (in msecs)

	  var dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000; // Per 4.2.1.2, Bump clockseq on clock regression

	  if (dt < 0 && options.clockseq === undefined) {
	    clockseq = clockseq + 1 & 0x3fff;
	  } // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
	  // time interval


	  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
	    nsecs = 0;
	  } // Per 4.2.1.2 Throw error if too many uuids are requested


	  if (nsecs >= 10000) {
	    throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
	  }

	  _lastMSecs = msecs;
	  _lastNSecs = nsecs;
	  _clockseq = clockseq; // Per 4.1.4 - Convert from unix epoch to Gregorian epoch

	  msecs += 12219292800000; // `time_low`

	  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
	  b[i++] = tl >>> 24 & 0xff;
	  b[i++] = tl >>> 16 & 0xff;
	  b[i++] = tl >>> 8 & 0xff;
	  b[i++] = tl & 0xff; // `time_mid`

	  var tmh = msecs / 0x100000000 * 10000 & 0xfffffff;
	  b[i++] = tmh >>> 8 & 0xff;
	  b[i++] = tmh & 0xff; // `time_high_and_version`

	  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version

	  b[i++] = tmh >>> 16 & 0xff; // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)

	  b[i++] = clockseq >>> 8 | 0x80; // `clock_seq_low`

	  b[i++] = clockseq & 0xff; // `node`

	  for (var n = 0; n < 6; ++n) {
	    b[i + n] = node[n];
	  }

	  return buf || (0, _stringify.default)(b);
	}

	var _default = v1;
	exports.default = _default;

/***/ }),
/* 10 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = rng;
	// Unique ID creation requires a high quality random # generator. In the browser we therefore
	// require the crypto API and do not support built-in fallback to lower quality random number
	// generators (like Math.random()).
	var getRandomValues = void 0;
	var rnds8 = new Uint8Array(16);

	function rng() {
	  // lazy load so that environments that need to polyfill have a chance to do so
	  if (!getRandomValues) {
	    // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
	    // find the complete implementation of crypto (msCrypto) on IE11.
	    getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== 'undefined' && typeof msCrypto.getRandomValues === 'function' && msCrypto.getRandomValues.bind(msCrypto);

	    if (!getRandomValues) {
	      throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
	    }
	  }

	  return getRandomValues(rnds8);
	}

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = void 0;

	var _validate = _interopRequireDefault(__webpack_require__(12));

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { default: obj };
	}

	/**
	 * Convert array of 16 byte values to UUID string format of the form:
	 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
	 */
	var byteToHex = [];

	for (var i = 0; i < 256; ++i) {
	  byteToHex.push((i + 0x100).toString(16).substr(1));
	}

	function stringify(arr) {
	  var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

	  // Note: Be careful editing this code!  It's been tuned for performance
	  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
	  var uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
	  // of the following:
	  // - One or more input array values don't map to a hex octet (leading to
	  // "undefined" in the uuid)
	  // - Invalid input values for the RFC `version` or `variant` fields

	  if (!(0, _validate.default)(uuid)) {
	    throw TypeError('Stringified UUID is invalid');
	  }

	  return uuid;
	}

	var _default = stringify;
	exports.default = _default;

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = void 0;

	var _regex = _interopRequireDefault(__webpack_require__(13));

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { default: obj };
	}

	function validate(uuid) {
	  return typeof uuid === 'string' && _regex.default.test(uuid);
	}

	var _default = validate;
	exports.default = _default;

/***/ }),
/* 13 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = void 0;
	var _default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
	exports.default = _default;

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = void 0;

	var _v = _interopRequireDefault(__webpack_require__(15));

	var _md = _interopRequireDefault(__webpack_require__(17));

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { default: obj };
	}

	var v3 = (0, _v.default)('v3', 0x30, _md.default);
	var _default = v3;
	exports.default = _default;

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = _default;
	exports.URL = exports.DNS = void 0;

	var _stringify = _interopRequireDefault(__webpack_require__(11));

	var _parse = _interopRequireDefault(__webpack_require__(16));

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { default: obj };
	}

	function stringToBytes(str) {
	  str = unescape(encodeURIComponent(str)); // UTF8 escape

	  var bytes = [];

	  for (var i = 0; i < str.length; ++i) {
	    bytes.push(str.charCodeAt(i));
	  }

	  return bytes;
	}

	var DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
	exports.DNS = DNS;
	var URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
	exports.URL = URL;

	function _default(name, version, hashfunc) {
	  function generateUUID(value, namespace, buf, offset) {
	    if (typeof value === 'string') {
	      value = stringToBytes(value);
	    }

	    if (typeof namespace === 'string') {
	      namespace = (0, _parse.default)(namespace);
	    }

	    if (namespace.length !== 16) {
	      throw TypeError('Namespace must be array-like (16 iterable integer values, 0-255)');
	    } // Compute hash of namespace and value, Per 4.3
	    // Future: Use spread syntax when supported on all platforms, e.g. `bytes =
	    // hashfunc([...namespace, ... value])`


	    var bytes = new Uint8Array(16 + value.length);
	    bytes.set(namespace);
	    bytes.set(value, namespace.length);
	    bytes = hashfunc(bytes);
	    bytes[6] = bytes[6] & 0x0f | version;
	    bytes[8] = bytes[8] & 0x3f | 0x80;

	    if (buf) {
	      offset = offset || 0;

	      for (var i = 0; i < 16; ++i) {
	        buf[offset + i] = bytes[i];
	      }

	      return buf;
	    }

	    return (0, _stringify.default)(bytes);
	  } // Function#name is not settable on some platforms (#270)


	  try {
	    generateUUID.name = name; // eslint-disable-next-line no-empty
	  } catch (err) {} // For CommonJS default export support


	  generateUUID.DNS = DNS;
	  generateUUID.URL = URL;
	  return generateUUID;
	}

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = void 0;

	var _validate = _interopRequireDefault(__webpack_require__(12));

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { default: obj };
	}

	function parse(uuid) {
	  if (!(0, _validate.default)(uuid)) {
	    throw TypeError('Invalid UUID');
	  }

	  var v = void 0;
	  var arr = new Uint8Array(16); // Parse ########-....-....-....-............

	  arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
	  arr[1] = v >>> 16 & 0xff;
	  arr[2] = v >>> 8 & 0xff;
	  arr[3] = v & 0xff; // Parse ........-####-....-....-............

	  arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
	  arr[5] = v & 0xff; // Parse ........-....-####-....-............

	  arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
	  arr[7] = v & 0xff; // Parse ........-....-....-####-............

	  arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
	  arr[9] = v & 0xff; // Parse ........-....-....-....-############
	  // (Use "/" to avoid 32-bit truncation when bit-shifting high-order bytes)

	  arr[10] = (v = parseInt(uuid.slice(24, 36), 16)) / 0x10000000000 & 0xff;
	  arr[11] = v / 0x100000000 & 0xff;
	  arr[12] = v >>> 24 & 0xff;
	  arr[13] = v >>> 16 & 0xff;
	  arr[14] = v >>> 8 & 0xff;
	  arr[15] = v & 0xff;
	  return arr;
	}

	var _default = parse;
	exports.default = _default;

/***/ }),
/* 17 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = void 0;

	/*
	 * Browser-compatible JavaScript MD5
	 *
	 * Modification of JavaScript MD5
	 * https://github.com/blueimp/JavaScript-MD5
	 *
	 * Copyright 2011, Sebastian Tschan
	 * https://blueimp.net
	 *
	 * Licensed under the MIT license:
	 * https://opensource.org/licenses/MIT
	 *
	 * Based on
	 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
	 * Digest Algorithm, as defined in RFC 1321.
	 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
	 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
	 * Distributed under the BSD License
	 * See http://pajhome.org.uk/crypt/md5 for more info.
	 */
	function md5(bytes) {
	  if (typeof bytes === 'string') {
	    var msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

	    bytes = new Uint8Array(msg.length);

	    for (var i = 0; i < msg.length; ++i) {
	      bytes[i] = msg.charCodeAt(i);
	    }
	  }

	  return md5ToHexEncodedArray(wordsToMd5(bytesToWords(bytes), bytes.length * 8));
	}
	/*
	 * Convert an array of little-endian words to an array of bytes
	 */

	function md5ToHexEncodedArray(input) {
	  var output = [];
	  var length32 = input.length * 32;
	  var hexTab = '0123456789abcdef';

	  for (var i = 0; i < length32; i += 8) {
	    var x = input[i >> 5] >>> i % 32 & 0xff;
	    var hex = parseInt(hexTab.charAt(x >>> 4 & 0x0f) + hexTab.charAt(x & 0x0f), 16);
	    output.push(hex);
	  }

	  return output;
	}
	/**
	 * Calculate output length with padding and bit length
	 */

	function getOutputLength(inputLength8) {
	  return (inputLength8 + 64 >>> 9 << 4) + 14 + 1;
	}
	/*
	 * Calculate the MD5 of an array of little-endian words, and a bit length.
	 */

	function wordsToMd5(x, len) {
	  /* append padding */
	  x[len >> 5] |= 0x80 << len % 32;
	  x[getOutputLength(len) - 1] = len;
	  var a = 1732584193;
	  var b = -271733879;
	  var c = -1732584194;
	  var d = 271733878;

	  for (var i = 0; i < x.length; i += 16) {
	    var olda = a;
	    var oldb = b;
	    var oldc = c;
	    var oldd = d;
	    a = md5ff(a, b, c, d, x[i], 7, -680876936);
	    d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
	    c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
	    b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
	    a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
	    d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
	    c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
	    b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
	    a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
	    d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
	    c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
	    b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
	    a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
	    d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
	    c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
	    b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
	    a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
	    d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
	    c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
	    b = md5gg(b, c, d, a, x[i], 20, -373897302);
	    a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
	    d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
	    c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
	    b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
	    a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
	    d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
	    c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
	    b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
	    a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
	    d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
	    c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
	    b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
	    a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
	    d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
	    c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
	    b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
	    a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
	    d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
	    c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
	    b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
	    a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
	    d = md5hh(d, a, b, c, x[i], 11, -358537222);
	    c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
	    b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
	    a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
	    d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
	    c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
	    b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
	    a = md5ii(a, b, c, d, x[i], 6, -198630844);
	    d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
	    c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
	    b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
	    a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
	    d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
	    c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
	    b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
	    a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
	    d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
	    c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
	    b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
	    a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
	    d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
	    c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
	    b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
	    a = safeAdd(a, olda);
	    b = safeAdd(b, oldb);
	    c = safeAdd(c, oldc);
	    d = safeAdd(d, oldd);
	  }

	  return [a, b, c, d];
	}
	/*
	 * Convert an array bytes to an array of little-endian words
	 * Characters >255 have their high-byte silently ignored.
	 */

	function bytesToWords(input) {
	  if (input.length === 0) {
	    return [];
	  }

	  var length8 = input.length * 8;
	  var output = new Uint32Array(getOutputLength(length8));

	  for (var i = 0; i < length8; i += 8) {
	    output[i >> 5] |= (input[i / 8] & 0xff) << i % 32;
	  }

	  return output;
	}
	/*
	 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
	 * to work around bugs in some JS interpreters.
	 */

	function safeAdd(x, y) {
	  var lsw = (x & 0xffff) + (y & 0xffff);
	  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	  return msw << 16 | lsw & 0xffff;
	}
	/*
	 * Bitwise rotate a 32-bit number to the left.
	 */

	function bitRotateLeft(num, cnt) {
	  return num << cnt | num >>> 32 - cnt;
	}
	/*
	 * These functions implement the four basic operations the algorithm uses.
	 */

	function md5cmn(q, a, b, x, s, t) {
	  return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
	}

	function md5ff(a, b, c, d, x, s, t) {
	  return md5cmn(b & c | ~b & d, a, b, x, s, t);
	}

	function md5gg(a, b, c, d, x, s, t) {
	  return md5cmn(b & d | c & ~d, a, b, x, s, t);
	}

	function md5hh(a, b, c, d, x, s, t) {
	  return md5cmn(b ^ c ^ d, a, b, x, s, t);
	}

	function md5ii(a, b, c, d, x, s, t) {
	  return md5cmn(c ^ (b | ~d), a, b, x, s, t);
	}

	var _default = md5;
	exports.default = _default;

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = void 0;

	var _rng = _interopRequireDefault(__webpack_require__(10));

	var _stringify = _interopRequireDefault(__webpack_require__(11));

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { default: obj };
	}

	function v4(options, buf, offset) {
	  options = options || {};

	  var rnds = options.random || (options.rng || _rng.default)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`


	  rnds[6] = rnds[6] & 0x0f | 0x40;
	  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

	  if (buf) {
	    offset = offset || 0;

	    for (var i = 0; i < 16; ++i) {
	      buf[offset + i] = rnds[i];
	    }

	    return buf;
	  }

	  return (0, _stringify.default)(rnds);
	}

	var _default = v4;
	exports.default = _default;

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = void 0;

	var _v = _interopRequireDefault(__webpack_require__(15));

	var _sha = _interopRequireDefault(__webpack_require__(20));

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { default: obj };
	}

	var v5 = (0, _v.default)('v5', 0x50, _sha.default);
	var _default = v5;
	exports.default = _default;

/***/ }),
/* 20 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = void 0;

	// Adapted from Chris Veness' SHA1 code at
	// http://www.movable-type.co.uk/scripts/sha1.html
	function f(s, x, y, z) {
	  switch (s) {
	    case 0:
	      return x & y ^ ~x & z;

	    case 1:
	      return x ^ y ^ z;

	    case 2:
	      return x & y ^ x & z ^ y & z;

	    case 3:
	      return x ^ y ^ z;
	  }
	}

	function ROTL(x, n) {
	  return x << n | x >>> 32 - n;
	}

	function sha1(bytes) {
	  var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
	  var H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];

	  if (typeof bytes === 'string') {
	    var msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

	    bytes = [];

	    for (var i = 0; i < msg.length; ++i) {
	      bytes.push(msg.charCodeAt(i));
	    }
	  } else if (!Array.isArray(bytes)) {
	    // Convert Array-like to Array
	    bytes = Array.prototype.slice.call(bytes);
	  }

	  bytes.push(0x80);
	  var l = bytes.length / 4 + 2;
	  var N = Math.ceil(l / 16);
	  var M = new Array(N);

	  for (var _i = 0; _i < N; ++_i) {
	    var arr = new Uint32Array(16);

	    for (var j = 0; j < 16; ++j) {
	      arr[j] = bytes[_i * 64 + j * 4] << 24 | bytes[_i * 64 + j * 4 + 1] << 16 | bytes[_i * 64 + j * 4 + 2] << 8 | bytes[_i * 64 + j * 4 + 3];
	    }

	    M[_i] = arr;
	  }

	  M[N - 1][14] = (bytes.length - 1) * 8 / Math.pow(2, 32);
	  M[N - 1][14] = Math.floor(M[N - 1][14]);
	  M[N - 1][15] = (bytes.length - 1) * 8 & 0xffffffff;

	  for (var _i2 = 0; _i2 < N; ++_i2) {
	    var W = new Uint32Array(80);

	    for (var t = 0; t < 16; ++t) {
	      W[t] = M[_i2][t];
	    }

	    for (var _t = 16; _t < 80; ++_t) {
	      W[_t] = ROTL(W[_t - 3] ^ W[_t - 8] ^ W[_t - 14] ^ W[_t - 16], 1);
	    }

	    var a = H[0];
	    var b = H[1];
	    var c = H[2];
	    var d = H[3];
	    var e = H[4];

	    for (var _t2 = 0; _t2 < 80; ++_t2) {
	      var s = Math.floor(_t2 / 20);
	      var T = ROTL(a, 5) + f(s, b, c, d) + e + K[s] + W[_t2] >>> 0;
	      e = d;
	      d = c;
	      c = ROTL(b, 30) >>> 0;
	      b = a;
	      a = T;
	    }

	    H[0] = H[0] + a >>> 0;
	    H[1] = H[1] + b >>> 0;
	    H[2] = H[2] + c >>> 0;
	    H[3] = H[3] + d >>> 0;
	    H[4] = H[4] + e >>> 0;
	  }

	  return [H[0] >> 24 & 0xff, H[0] >> 16 & 0xff, H[0] >> 8 & 0xff, H[0] & 0xff, H[1] >> 24 & 0xff, H[1] >> 16 & 0xff, H[1] >> 8 & 0xff, H[1] & 0xff, H[2] >> 24 & 0xff, H[2] >> 16 & 0xff, H[2] >> 8 & 0xff, H[2] & 0xff, H[3] >> 24 & 0xff, H[3] >> 16 & 0xff, H[3] >> 8 & 0xff, H[3] & 0xff, H[4] >> 24 & 0xff, H[4] >> 16 & 0xff, H[4] >> 8 & 0xff, H[4] & 0xff];
	}

	var _default = sha1;
	exports.default = _default;

/***/ }),
/* 21 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = void 0;
	var _default = '00000000-0000-0000-0000-000000000000';
	exports.default = _default;

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = void 0;

	var _validate = _interopRequireDefault(__webpack_require__(12));

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { default: obj };
	}

	function version(uuid) {
	  if (!(0, _validate.default)(uuid)) {
	    throw TypeError('Invalid UUID');
	  }

	  return parseInt(uuid.substr(14, 1), 16);
	}

	var _default = version;
	exports.default = _default;

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.FullUpdateDataT = exports.FullUpdateData = void 0;
	var flatbuffers = __webpack_require__(24);
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
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ByteBuffer = exports.Builder = exports.Encoding = exports.createLong = exports.Long = exports.isLittleEndian = exports.float64 = exports.float32 = exports.int32 = exports.SIZE_PREFIX_LENGTH = exports.FILE_IDENTIFIER_LENGTH = exports.SIZEOF_INT = exports.SIZEOF_SHORT = void 0;
	var constants_1 = __webpack_require__(25);
	Object.defineProperty(exports, "SIZEOF_SHORT", { enumerable: true, get: function get() {
	    return constants_1.SIZEOF_SHORT;
	  } });
	var constants_2 = __webpack_require__(25);
	Object.defineProperty(exports, "SIZEOF_INT", { enumerable: true, get: function get() {
	    return constants_2.SIZEOF_INT;
	  } });
	var constants_3 = __webpack_require__(25);
	Object.defineProperty(exports, "FILE_IDENTIFIER_LENGTH", { enumerable: true, get: function get() {
	    return constants_3.FILE_IDENTIFIER_LENGTH;
	  } });
	var constants_4 = __webpack_require__(25);
	Object.defineProperty(exports, "SIZE_PREFIX_LENGTH", { enumerable: true, get: function get() {
	    return constants_4.SIZE_PREFIX_LENGTH;
	  } });
	var utils_1 = __webpack_require__(26);
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
	var long_1 = __webpack_require__(27);
	Object.defineProperty(exports, "Long", { enumerable: true, get: function get() {
	    return long_1.Long;
	  } });
	Object.defineProperty(exports, "createLong", { enumerable: true, get: function get() {
	    return long_1.createLong;
	  } });
	var encoding_1 = __webpack_require__(28);
	Object.defineProperty(exports, "Encoding", { enumerable: true, get: function get() {
	    return encoding_1.Encoding;
	  } });
	var builder_1 = __webpack_require__(29);
	Object.defineProperty(exports, "Builder", { enumerable: true, get: function get() {
	    return builder_1.Builder;
	  } });
	var byte_buffer_1 = __webpack_require__(30);
	Object.defineProperty(exports, "ByteBuffer", { enumerable: true, get: function get() {
	    return byte_buffer_1.ByteBuffer;
	  } });

/***/ }),
/* 25 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.SIZE_PREFIX_LENGTH = exports.FILE_IDENTIFIER_LENGTH = exports.SIZEOF_INT = exports.SIZEOF_SHORT = void 0;
	exports.SIZEOF_SHORT = 2;
	exports.SIZEOF_INT = 4;
	exports.FILE_IDENTIFIER_LENGTH = 4;
	exports.SIZE_PREFIX_LENGTH = 4;

/***/ }),
/* 26 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.isLittleEndian = exports.float64 = exports.float32 = exports.int32 = void 0;
	exports.int32 = new Int32Array(2);
	exports.float32 = new Float32Array(exports.int32.buffer);
	exports.float64 = new Float64Array(exports.int32.buffer);
	exports.isLittleEndian = new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;

/***/ }),
/* 27 */
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
/* 28 */
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
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Builder = void 0;
	var byte_buffer_1 = __webpack_require__(30);
	var constants_1 = __webpack_require__(25);
	var long_1 = __webpack_require__(27);
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
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ByteBuffer = void 0;
	var constants_1 = __webpack_require__(25);
	var long_1 = __webpack_require__(27);
	var utils_1 = __webpack_require__(26);
	var encoding_1 = __webpack_require__(28);
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
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/* global AFRAME, NAF */

	var _require = __webpack_require__(29),
	    Builder = _require.Builder;

	var ReservedDataType = { Update: 'u', Remove: 'r' };

	// Flatbuffers builder
	var flatbuilder = new Builder(1024);

	var FBMessage = __webpack_require__(32).Message;
	var FBCustomOp = __webpack_require__(33).CustomOp;

	var typedArrayToBase64 = function typedArrayToBase64(bytes) {
	  var binary = '';
	  for (var i = 0, l = bytes.byteLength; i < l; i++) {
	    binary += String.fromCharCode(bytes[i]);
	  }
	  return window.btoa(binary);
	};

	var NetworkConnection = function () {
	  function NetworkConnection(networkEntities) {
	    _classCallCheck(this, NetworkConnection);

	    this.entities = networkEntities;
	    this.dataChannelSubs = {};

	    this.connectedClients = {};
	    this.activeDataChannels = {};
	  }

	  _createClass(NetworkConnection, [{
	    key: 'setNetworkAdapter',
	    value: function setNetworkAdapter(adapter) {
	      this.adapter = adapter;
	    }
	  }, {
	    key: 'connect',
	    value: function connect(serverUrl, appName, roomName) {
	      var enableAudio = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

	      NAF.app = appName;
	      NAF.room = roomName;

	      this.adapter.setServerUrl(serverUrl);
	      this.adapter.setApp(appName);
	      this.adapter.setRoom(roomName);

	      this.adapter.setServerConnectListeners(this.connectSuccess.bind(this), this.connectFailure.bind(this));
	      this.adapter.setDataChannelListeners(this.dataChannelOpen.bind(this), this.dataChannelClosed.bind(this), this.receivedData.bind(this));
	      this.adapter.setRoomOccupantListener(this.occupantsReceived.bind(this));

	      return this.adapter.connect();
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

	      var evt = new CustomEvent('connected', { 'detail': { clientId: clientId } });
	      document.body.dispatchEvent(evt);
	    }
	  }, {
	    key: 'connectFailure',
	    value: function connectFailure(errorCode, message) {
	      NAF.log.error(errorCode, "failure to connect");
	    }
	  }, {
	    key: 'occupantsReceived',
	    value: function occupantsReceived(occupantList) {
	      var prevConnectedClients = Object.assign({}, this.connectedClients);
	      this.connectedClients = occupantList;
	      this.checkForDisconnectingClients(prevConnectedClients, occupantList);
	      this.checkForConnectingClients(occupantList);
	    }
	  }, {
	    key: 'checkForDisconnectingClients',
	    value: function checkForDisconnectingClients(oldOccupantList, newOccupantList) {
	      for (var id in oldOccupantList) {
	        var clientFound = newOccupantList.hasOwnProperty(id);
	        if (!clientFound) {
	          NAF.log.write('Closing stream to ', id);
	          this.adapter.closeStreamConnection(id);
	        }
	      }
	    }

	    // Some adapters will handle this internally

	  }, {
	    key: 'checkForConnectingClients',
	    value: function checkForConnectingClients(occupantList) {
	      for (var id in occupantList) {
	        var startConnection = this.isNewClient(id) && this.adapter.shouldStartConnectionTo(occupantList[id]);
	        if (startConnection) {
	          NAF.log.write('Opening datachannel to ', id);
	          this.adapter.startStreamConnection(id);
	        }
	      }
	    }
	  }, {
	    key: 'getConnectedClients',
	    value: function getConnectedClients() {
	      return this.connectedClients;
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

	      var evt = new CustomEvent('clientConnected', { detail: { clientId: clientId } });
	      document.body.dispatchEvent(evt);
	    }
	  }, {
	    key: 'dataChannelClosed',
	    value: function dataChannelClosed(clientId) {
	      NAF.log.write('Closed data channel from ' + clientId);
	      this.activeDataChannels[clientId] = false;
	      this.entities.removeEntitiesOfClient(clientId);

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
	      this.adapter.broadcastData(data);
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
	        NAF.connection.broadcastDataGuaranteed(typedArrayToBase64(flatbuilder.asUint8Array()));
	      } else {
	        NAF.connection.broadcastData(typedArrayToBase64(flatbuilder.asUint8Array()));
	      }
	    }
	  }, {
	    key: 'broadcastCustomDataGuaranteed',
	    value: function broadcastCustomDataGuaranteed(dataType, customData) {
	      this.broadcastCustomData(dataType, customData, true);
	    }
	  }, {
	    key: 'sendData',
	    value: function sendData(data, toClientId, guaranteed) {
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

	      var customOffset = FBCustomOp.createCustomOp(flatbuilder, flatbuilder.createSharedString(dataType), flatbuilder.createString(JSON.stringify(customData)));

	      var customsOffset = FBMessage.createCustomsVector(flatbuilder, [customOffset]);
	      FBMessage.startMessage(flatbuilder);
	      FBMessage.addCustoms(flatbuilder, customsOffset);
	      var messageOffset = FBMessage.endMessage(flatbuilder);
	      flatbuilder.finish(messageOffset);
	    }
	  }, {
	    key: 'sendCustomData',
	    value: function sendCustomData(dataType, customData, toClientId) {
	      var guaranteed = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

	      this.fillBuilderWithCustomData(dataType, customData);

	      if (guaranteed) {
	        NAF.connection.sendDataGuaranteed(typedArrayToBase64(flatbuilder.asUint8Array()), toClientId);
	      } else {
	        NAF.connection.sendData(typedArrayToBase64(flatbuilder.asUint8Array()), toClientId);
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
	      return dataType == ReservedDataType.Update || dataType == ReservedDataType.Remove;
	    }

	    // Returns true if a new entity was created

	  }, {
	    key: 'receivedData',
	    value: function receivedData(data, source, sender) {
	      AFRAME.scenes[0].systems.networked.enqueueIncoming(data, source, sender);
	    }
	  }, {
	    key: 'getServerTime',
	    value: function getServerTime() {
	      return this.adapter.getServerTime();
	    }
	  }, {
	    key: 'disconnect',
	    value: function disconnect() {
	      this.entities.removeRemoteEntities();
	      this.adapter.disconnect();

	      NAF.app = '';
	      NAF.room = '';
	      NAF.clientId = '';
	      this.connectedClients = {};
	      this.activeDataChannels = {};
	      this.adapter = null;

	      document.body.removeEventListener('connected', this.onConnectCallback);
	    }
	  }]);

	  return NetworkConnection;
	}();

	module.exports = NetworkConnection;

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.MessageT = exports.Message = void 0;
	var flatbuffers = __webpack_require__(24);
	var custom_op_1 = __webpack_require__(33);
	var delete_op_1 = __webpack_require__(34);
	var update_op_1 = __webpack_require__(35);
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
	    Message.prototype.updates = function (index, obj) {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? (obj || new update_op_1.UpdateOp()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
	    };
	    Message.prototype.updatesLength = function () {
	        var offset = this.bb.__offset(this.bb_pos, 4);
	        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
	    };
	    Message.prototype.deletes = function (index, obj) {
	        var offset = this.bb.__offset(this.bb_pos, 6);
	        return offset ? (obj || new delete_op_1.DeleteOp()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
	    };
	    Message.prototype.deletesLength = function () {
	        var offset = this.bb.__offset(this.bb_pos, 6);
	        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
	    };
	    Message.prototype.customs = function (index, obj) {
	        var offset = this.bb.__offset(this.bb_pos, 8);
	        return offset ? (obj || new custom_op_1.CustomOp()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
	    };
	    Message.prototype.customsLength = function () {
	        var offset = this.bb.__offset(this.bb_pos, 8);
	        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
	    };
	    Message.startMessage = function (builder) {
	        builder.startObject(3);
	    };
	    Message.addUpdates = function (builder, updatesOffset) {
	        builder.addFieldOffset(0, updatesOffset, 0);
	    };
	    Message.createUpdatesVector = function (builder, data) {
	        builder.startVector(4, data.length, 4);
	        for (var i = data.length - 1; i >= 0; i--) {
	            builder.addOffset(data[i]);
	        }
	        return builder.endVector();
	    };
	    Message.startUpdatesVector = function (builder, numElems) {
	        builder.startVector(4, numElems, 4);
	    };
	    Message.addDeletes = function (builder, deletesOffset) {
	        builder.addFieldOffset(1, deletesOffset, 0);
	    };
	    Message.createDeletesVector = function (builder, data) {
	        builder.startVector(4, data.length, 4);
	        for (var i = data.length - 1; i >= 0; i--) {
	            builder.addOffset(data[i]);
	        }
	        return builder.endVector();
	    };
	    Message.startDeletesVector = function (builder, numElems) {
	        builder.startVector(4, numElems, 4);
	    };
	    Message.addCustoms = function (builder, customsOffset) {
	        builder.addFieldOffset(2, customsOffset, 0);
	    };
	    Message.createCustomsVector = function (builder, data) {
	        builder.startVector(4, data.length, 4);
	        for (var i = data.length - 1; i >= 0; i--) {
	            builder.addOffset(data[i]);
	        }
	        return builder.endVector();
	    };
	    Message.startCustomsVector = function (builder, numElems) {
	        builder.startVector(4, numElems, 4);
	    };
	    Message.endMessage = function (builder) {
	        var offset = builder.endObject();
	        return offset;
	    };
	    Message.finishMessageBuffer = function (builder, offset) {
	        builder.finish(offset);
	    };
	    Message.finishSizePrefixedMessageBuffer = function (builder, offset) {
	        builder.finish(offset, undefined, true);
	    };
	    Message.createMessage = function (builder, updatesOffset, deletesOffset, customsOffset) {
	        Message.startMessage(builder);
	        Message.addUpdates(builder, updatesOffset);
	        Message.addDeletes(builder, deletesOffset);
	        Message.addCustoms(builder, customsOffset);
	        return Message.endMessage(builder);
	    };
	    Message.prototype.unpack = function () {
	        return new MessageT(this.bb.createObjList(this.updates.bind(this), this.updatesLength()), this.bb.createObjList(this.deletes.bind(this), this.deletesLength()), this.bb.createObjList(this.customs.bind(this), this.customsLength()));
	    };
	    Message.prototype.unpackTo = function (_o) {
	        _o.updates = this.bb.createObjList(this.updates.bind(this), this.updatesLength());
	        _o.deletes = this.bb.createObjList(this.deletes.bind(this), this.deletesLength());
	        _o.customs = this.bb.createObjList(this.customs.bind(this), this.customsLength());
	    };
	    return Message;
	}();
	exports.Message = Message;
	var MessageT = /** @class */function () {
	    function MessageT(updates, deletes, customs) {
	        if (updates === void 0) {
	            updates = [];
	        }
	        if (deletes === void 0) {
	            deletes = [];
	        }
	        if (customs === void 0) {
	            customs = [];
	        }
	        this.updates = updates;
	        this.deletes = deletes;
	        this.customs = customs;
	    }
	    MessageT.prototype.pack = function (builder) {
	        var updates = Message.createUpdatesVector(builder, builder.createObjectOffsetList(this.updates));
	        var deletes = Message.createDeletesVector(builder, builder.createObjectOffsetList(this.deletes));
	        var customs = Message.createCustomsVector(builder, builder.createObjectOffsetList(this.customs));
	        return Message.createMessage(builder, updates, deletes, customs);
	    };
	    return MessageT;
	}();
	exports.MessageT = MessageT;

/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.CustomOpT = exports.CustomOp = void 0;
	var flatbuffers = __webpack_require__(24);
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
	    CustomOp.prototype.payload = function (optionalEncoding) {
	        var offset = this.bb.__offset(this.bb_pos, 6);
	        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
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
	        return new CustomOpT(this.dataType(), this.payload());
	    };
	    CustomOp.prototype.unpackTo = function (_o) {
	        _o.dataType = this.dataType();
	        _o.payload = this.payload();
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
	            payload = null;
	        }
	        this.dataType = dataType;
	        this.payload = payload;
	    }
	    CustomOpT.prototype.pack = function (builder) {
	        var dataType = this.dataType !== null ? builder.createString(this.dataType) : 0;
	        var payload = this.payload !== null ? builder.createString(this.payload) : 0;
	        return CustomOp.createCustomOp(builder, dataType, payload);
	    };
	    return CustomOpT;
	}();
	exports.CustomOpT = CustomOpT;

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.DeleteOpT = exports.DeleteOp = void 0;
	var flatbuffers = __webpack_require__(24);
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
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	// automatically generated by the FlatBuffers compiler, do not modify

	exports.__esModule = true;
	exports.UpdateOpT = exports.UpdateOp = void 0;
	var flatbuffers = __webpack_require__(24);
	var full_update_data_1 = __webpack_require__(23);
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
	        return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
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
	        builder.addFieldInt32(3, lastOwnerTime, 0);
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
	            lastOwnerTime = 0;
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
/* 36 */
/***/ (function(module, exports) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var AdapterFactory = function () {
	  function AdapterFactory() {
	    _classCallCheck(this, AdapterFactory);

	    this.adapters = {};
	    this.IS_CONNECTED = AdapterFactory.IS_CONNECTED;
	    this.CONNECTING = AdapterFactory.CONNECTING;
	    this.NOT_CONNECTED = AdapterFactory.NOT_CONNECTED;
	  }

	  _createClass(AdapterFactory, [{
	    key: "register",
	    value: function register(adapterName, AdapterClass) {
	      this.adapters[adapterName] = AdapterClass;
	    }
	  }, {
	    key: "make",
	    value: function make(adapterName) {
	      var name = adapterName.toLowerCase();
	      if (this.adapters[name]) {
	        var AdapterClass = this.adapters[name];
	        return new AdapterClass();
	      } else {
	        throw new Error("Adapter: " + adapterName + " not registered. Please use NAF.adapters.register() to register this adapter.");
	      }
	    }
	  }]);

	  return AdapterFactory;
	}();

	AdapterFactory.IS_CONNECTED = "IS_CONNECTED";
	AdapterFactory.CONNECTING = "CONNECTING";
	AdapterFactory.NOT_CONNECTED = "NOT_CONNECTED";

	module.exports = AdapterFactory;

/***/ }),
/* 37 */
/***/ (function(module, exports) {

	'use strict';

	/* global AFRAME, NAF */

	AFRAME.registerComponent('networked-scene', {
	  schema: {
	    serverURL: { default: '/' },
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

	    this.checkDeprecatedProperties();
	    this.setupNetworkAdapter();

	    if (this.hasOnConnectFunction()) {
	      this.callOnConnect();
	    }
	    return NAF.connection.connect(this.data.serverURL, this.data.app, this.data.room, this.data.audio);
	  },

	  checkDeprecatedProperties: function checkDeprecatedProperties() {
	    // No current
	  },

	  setupNetworkAdapter: function setupNetworkAdapter() {
	    var adapterName = this.data.adapter;
	    var adapter = NAF.adapters.make(adapterName);
	    NAF.connection.setNetworkAdapter(adapter);
	    this.el.emit('adapter-ready', adapter, false);
	  },

	  hasOnConnectFunction: function hasOnConnectFunction() {
	    return this.data.onConnect != '' && window.hasOwnProperty(this.data.onConnect);
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
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	/* global AFRAME, NAF, THREE */
	var flexbuffers = __webpack_require__(39);

	var _require = __webpack_require__(47),
	    Reference = _require.Reference;

	var _require2 = __webpack_require__(30),
	    ByteBuffer = _require2.ByteBuffer;

	var _require3 = __webpack_require__(29),
	    Builder = _require3.Builder;

	var _require4 = __webpack_require__(42),
	    fromByteWidth = _require4.fromByteWidth;

	var _require5 = __webpack_require__(49),
	    refCp = _require5.refCp,
	    refGetNumeric = _require5.refGetNumeric,
	    refGetInt = _require5.refGetInt,
	    refGetToObject = _require5.refGetToObject,
	    refAdvanceToIndexGet = _require5.refAdvanceToIndexGet;

	var uuid = __webpack_require__(8);
	var deepEqual = __webpack_require__(50);
	var DEG2RAD = THREE.Math.DEG2RAD;
	var OBJECT3D_COMPONENTS = ['position', 'rotation', 'scale'];

	var _require6 = __webpack_require__(51),
	    Lerper = _require6.Lerper,
	    TYPE_POSITION = _require6.TYPE_POSITION,
	    TYPE_QUATERNION = _require6.TYPE_QUATERNION,
	    TYPE_SCALE = _require6.TYPE_SCALE;

	var tmpPosition = new THREE.Vector3();
	var tmpQuaternion = new THREE.Quaternion();
	var BASE_OWNER_TIME = 1636600000000;

	var FBMessage = __webpack_require__(32).Message;
	var FBFullUpdateData = __webpack_require__(23).FullUpdateData;
	var FBUpdateOp = __webpack_require__(35).UpdateOp;
	var FBDeleteOp = __webpack_require__(34).DeleteOp;
	var FBCustomOp = __webpack_require__(33).CustomOp;

	var uuidByteBuf = [];
	var opOffsetBuf = [];
	var fullUpdateDataRef = new FBFullUpdateData();
	var messageRef = new FBMessage();
	var updateRef = new FBUpdateOp();
	var deleteRef = new FBDeleteOp();
	var customRef = new FBCustomOp();

	var base64ToUint8Array = function base64ToUint8Array(base64) {
	  var binary_string = window.atob(base64);
	  var len = binary_string.length;
	  var bytes = new Uint8Array(len);
	  for (var i = 0; i < len; i++) {
	    bytes[i] = binary_string.charCodeAt(i);
	  }
	  return bytes;
	};

	function uuidParse(uuid, arr) {
	  arr.length = 16;

	  var v;

	  arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
	  arr[1] = v >>> 16 & 0xff;
	  arr[2] = v >>> 8 & 0xff;
	  arr[3] = v & 0xff; // Parse ........-####-....-....-............

	  arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
	  arr[5] = v & 0xff; // Parse ........-....-####-....-............

	  arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
	  arr[7] = v & 0xff; // Parse ........-....-....-####-............

	  arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
	  arr[9] = v & 0xff; // Parse ........-....-....-....-############
	  // (Use "/" to avoid 32-bit truncation when bit-shifting high-order bytes)

	  arr[10] = (v = parseInt(uuid.slice(24, 36), 16)) / 0x10000000000 & 0xff;
	  arr[11] = v / 0x100000000 & 0xff;
	  arr[12] = v >>> 24 & 0xff;
	  arr[13] = v >>> 16 & 0xff;
	  arr[14] = v >>> 8 & 0xff;
	  arr[15] = v & 0xff;
	  return arr;
	}

	var tmpRef = new flexbuffers.toReference(new ArrayBuffer(4));

	// Flatbuffers builder
	var flatbuilder = new Builder(1024);

	// Flexbuffer builder
	var flexbuilder = new flexbuffers.builder();

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

	var typedArrayToBase64 = function typedArrayToBase64(bytes) {
	  var binary = '';
	  for (var i = 0, l = bytes.byteLength; i < l; i++) {
	    binary += String.fromCharCode(bytes[i]);
	  }
	  return window.btoa(binary);
	};

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

	AFRAME.registerSystem("networked", {
	  init: function init() {
	    // An array of "networked" component instances.
	    this.components = [];

	    // Incoming messages and flag to determine if incoming message processing should pause
	    this.incomingData = [];
	    this.incomingSources = [];
	    this.incomingSenders = [];
	    this.incomingPaused = false;

	    this.nextSyncTime = 0;
	  },
	  register: function register(component) {
	    this.components.push(component);
	  },
	  deregister: function deregister(component) {
	    var idx = this.components.indexOf(component);

	    if (idx > -1) {
	      this.components.splice(idx, 1);
	    }
	  },
	  enqueueIncoming: function enqueueIncoming(data, source, sender) {
	    this.incomingData.push(data);
	    this.incomingSources.push(source);
	    this.incomingSenders.push(sender);
	  },


	  tick: function () {
	    return function () {
	      if (!NAF.connection.adapter) return;
	      if (!this.incomingPaused) this.performReceiveStep();

	      if (this.el.clock.elapsedTime < this.nextSyncTime) return;
	      this.performSendStep();
	    };
	  }(),

	  performReceiveStep: function performReceiveStep() {
	    var incomingData = this.incomingData,
	        incomingSources = this.incomingSources,
	        incomingSenders = this.incomingSenders;


	    outer: for (var i = 0, l = incomingData.length; i < l; i++) {
	      var data = incomingData.shift();
	      var source = incomingSources.shift();
	      var sender = incomingSenders.shift();

	      FBMessage.getRootAsMessage(new ByteBuffer(base64ToUint8Array(data)), messageRef);

	      for (var _i = 0, _l = messageRef.updatesLength(); _i < _l; _i++) {
	        messageRef.updates(_i, updateRef);

	        var isFullSync = updateRef.fullUpdateData(fullUpdateDataRef) != null;

	        // Requeue the message if we don't have an entity yet if:
	        // - It is a full sync for a persistent object (scene will add it)
	        // - It is a non full sync (the entity is mid-instantiation still)
	        if ((isFullSync && fullUpdateDataRef.persistent() || !isFullSync) && !NAF.entities.hasEntity(updateRef.networkId())) {
	          incomingData.push(data);
	          incomingSources.push(source);
	          incomingSenders.push(sender);
	          continue outer;
	        }
	      }

	      for (var _i2 = 0, _l2 = messageRef.updatesLength(); _i2 < _l2; _i2++) {
	        messageRef.updates(_i2, updateRef);
	        NAF.entities.updateEntity(updateRef, source, sender);
	      }

	      for (var _i3 = 0, _l3 = messageRef.deletesLength(); _i3 < _l3; _i3++) {
	        messageRef.deletes(_i3, deleteRef);
	        NAF.entities.removeRemoteEntity(deleteRef, source, sender);
	      }

	      for (var _i4 = 0, _l4 = messageRef.customsLength(); _i4 < _l4; _i4++) {
	        messageRef.customs(_i4, customRef);
	        var dataType = customRef.dataType();

	        if (NAF.connection.dataChannelSubs[dataType]) {
	          NAF.connection.dataChannelSubs[dataType](dataType, JSON.parse(customRef.payload()));
	        }
	      }
	    }
	  },
	  performSendStep: function performSendStep() {
	    var send = false;
	    var sendGuaranteed = false;

	    for (var i = 0, l = this.components.length; i < l; i++) {
	      var c = this.components[i];
	      if (!c.isMine()) continue;
	      if (!c.canSync()) continue;
	      if (!c.el.parentElement) {
	        NAF.log.error("entity registered with system despite being removed");
	        //TODO: Find out why tick is still being called
	        continue;
	      }

	      var isFull = false;

	      if (c.pendingFullSync) {
	        isFull = true;
	        c.pendingFullSync = false;
	      }

	      resetFlexBuilder();

	      if (!c.pushComponentsDataToFlexBuilder(isFull)) continue;

	      if (!send) {
	        flatbuilder.clear();
	        opOffsetBuf.length = 0;
	        send = true;
	      }

	      var componentsOffset = FBUpdateOp.createComponentsVector(flatbuilder, new Uint8Array(flexbuilder.finish()));
	      var ownerOffset = FBUpdateOp.createOwnerVector(flatbuilder, uuidParse(c.data.owner, uuidByteBuf));

	      var fullUpdateDataOffset = null;

	      if (isFull) {
	        sendGuaranteed = true;

	        fullUpdateDataOffset = FBFullUpdateData.createFullUpdateData(flatbuilder, FBFullUpdateData.createCreatorVector(flatbuilder, uuidParse(c.data.creator, uuidByteBuf)), flatbuilder.createSharedString(c.data.template), c.data.persistent, flatbuilder.createSharedString(c.getParentId()));
	      }

	      var networkIdOffset = flatbuilder.createSharedString(c.data.networkId);
	      FBUpdateOp.startUpdateOp(flatbuilder);
	      FBUpdateOp.addNetworkId(flatbuilder, networkIdOffset);
	      FBUpdateOp.addOwner(flatbuilder, ownerOffset);
	      FBUpdateOp.addLastOwnerTime(flatbuilder, c.lastOwnerTime - BASE_OWNER_TIME);
	      FBUpdateOp.addComponents(flatbuilder, componentsOffset);

	      if (fullUpdateDataOffset !== null) {
	        FBUpdateOp.addFullUpdateData(flatbuilder, fullUpdateDataOffset);
	      }

	      opOffsetBuf.push(FBUpdateOp.endUpdateOp(flatbuilder));
	    }

	    if (send) {
	      var updatesOffset = FBMessage.createUpdatesVector(flatbuilder, opOffsetBuf);
	      FBMessage.startMessage(flatbuilder);
	      FBMessage.addUpdates(flatbuilder, updatesOffset);
	      var messageOffset = FBMessage.endMessage(flatbuilder);

	      flatbuilder.finish(messageOffset);

	      if (sendGuaranteed) {
	        NAF.connection.broadcastDataGuaranteed(typedArrayToBase64(flatbuilder.asUint8Array()));
	      } else {
	        NAF.connection.broadcastData(typedArrayToBase64(flatbuilder.asUint8Array()));
	      }
	    }

	    this.updateNextSyncTime();
	  },
	  updateNextSyncTime: function updateNextSyncTime() {
	    this.nextSyncTime = this.el.clock.elapsedTime + 1 / NAF.options.updateRate;
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
	    this.conversionEuler.order = "YXZ";
	    this.lerpers = [];
	    this.pendingFullSync = false;

	    var wasCreatedByNetwork = this.wasCreatedByNetwork();

	    this.onConnected = this.onConnected.bind(this);

	    this.componentSchemas = NAF.schemas.getComponents(this.data.template);
	    this.cachedElements = new Array(this.componentSchemas.length);
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
	      this.firstUpdate();
	    } else {
	      if (this.data.attachTemplateToLocal) {
	        this.attachTemplateToLocal();
	      }

	      this.registerEntity(this.data.networkId);
	    }

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

	  registerEntity: function registerEntity(networkId) {
	    NAF.entities.registerEntity(networkId, this.el);
	  },

	  applyPersistentFirstSync: function applyPersistentFirstSync() {
	    var _data = this.data,
	        networkId = _data.networkId,
	        creator = _data.creator;

	    var persistentUpdateRef = NAF.entities.getPersistentFirstSync(networkId);
	    if (persistentUpdateRef) {
	      // Can presume offset zero for first full sync
	      this.networkUpdate(persistentUpdateRef, creator);
	      NAF.entities.forgetPersistentFirstSync(networkId);
	    }
	  },

	  firstUpdate: function firstUpdate() {
	    this.networkUpdate(this.el.firstUpdateRef, this.data.creator);
	  },

	  onConnected: function onConnected() {
	    var _this = this;

	    this.positionNormalizer = NAF.entities.positionNormalizer;
	    this.positionDenormalizer = NAF.entities.positionDenormalizer;

	    if (this.data.owner === '') {
	      this.lastOwnerTime = NAF.connection.getServerTime();
	      this.el.setAttribute(this.name, { owner: NAF.clientId, creator: NAF.clientId });
	      this.el.object3D.matrixNeedsUpdate = true;
	      setTimeout(function () {
	        //a-primitives attach their components on the next frame; wait for components to be attached before calling syncAll
	        if (!_this.el.parentNode) {
	          NAF.log.warn("Networked element was removed before ever getting the chance to syncAll");
	          return;
	        }
	        _this.syncAll();
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
	    if (!this.canSync()) return;
	    this.pendingFullSync = true;
	  },

	  getCachedElement: function getCachedElement(componentSchemaIndex) {
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
	      if (this.networkUpdatePredicates[i](syncedComponentData) || fullSync) {
	        // Components preamble
	        if (!hadComponents) {
	          flexbuilder.startVector();
	        }

	        hadComponents = true;

	        var dataToSync = syncedComponentData;

	        if (this.positionNormalizer && componentName === "position") {
	          dataToSync = this.positionNormalizer(dataToSync, this.el);
	        }

	        flexbuilder.startVector();
	        flexbuilder.addInt(i);

	        if (OBJECT3D_COMPONENTS.includes(componentName)) {
	          flexbuilder.addFloat(Math.fround(dataToSync.x));
	          flexbuilder.addFloat(Math.fround(dataToSync.y));
	          flexbuilder.addFloat(Math.fround(dataToSync.z));
	        } else {
	          if ((typeof dataToSync === 'undefined' ? 'undefined' : _typeof(dataToSync)) === 'object') {
	            if (!aframeSchemaSortedKeys.has(componentName)) {
	              aframeSchemaSortedKeys.set(componentName, [].concat(_toConsumableArray(Object.keys(AFRAME.components[componentName].schema))).sort());
	            }

	            var aframeSchemaKeys = aframeSchemaSortedKeys.get(componentName);

	            for (var j = 0; j <= aframeSchemaKeys.length; j++) {
	              var key = aframeSchemaKeys[j];

	              if (dataToSync[key] !== undefined) {
	                flexbuilder.addInt(j);

	                var value = dataToSync[key];

	                if (typeof value === "number") {
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
	          } else {
	            flexbuilder.addInt(0);

	            var _value = dataToSync;

	            if ((typeof _value === 'undefined' ? 'undefined' : _typeof(_value)) === "object") {
	              NAF.log.error('Schema should not set property for object or array values', _value, componentSchema);
	            } else if (typeof _value === "number") {
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

	    uuidByteBuf.length = 16;
	    for (var i = 0; i < 16; i++) {
	      uuidByteBuf[i] = updateRef.owner(i);
	    }

	    var entityDataOwner = uuid.stringify(uuidByteBuf);
	    var entityDataLastOwnerTime = updateRef.lastOwnerTime() + BASE_OWNER_TIME;

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
	    var len = componentArray.byteLength;
	    var dataView = new DataView(componentArray.buffer, componentArray.byteOffset, componentArray.byteLength);
	    var byteWidth = dataView.getUint8(len - 1);
	    var packedType = dataView.getUint8(len - 2);
	    var parentWidth = fromByteWidth(byteWidth);
	    var offset = len - byteWidth - 2;
	    var entityDataRef = new Reference(dataView, offset, parentWidth, packedType, "/");
	    this.updateNetworkedComponents(entityDataRef, isFullSync, sender);
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
	        if (componentSchema.property) {
	          // Skip the property index which is always zero for this.
	          var attributeValue = _defineProperty({}, componentSchema.property, refGetToObject(componentDataRef, 2));

	          if (NAF.connection.adapter.sanitizeComponentValues(this.el, componentName, attributeValue, sender)) {
	            el.setAttribute(componentName, attributeValue);
	          }
	        } else {
	          if (!aframeSchemaSortedKeys.has(componentName)) {
	            var schema = AFRAME.components[componentName].schema;

	            if (schema.default) {
	              aframeSchemaSortedKeys.set(componentName, [].sort());
	            } else {
	              aframeSchemaSortedKeys.set(componentName, [].concat(_toConsumableArray(Object.keys(AFRAME.components[componentName].schema))).sort());
	            }
	          }

	          var componentDataLength = componentDataRef.length();

	          if (componentDataLength > 1) {
	            var _attributeValue2 = {};
	            var aframeSchemaKeys = aframeSchemaSortedKeys.get(componentName);

	            for (var j = 1; j < componentDataLength; j += 2) {
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
	      } else {
	        if (NAF.connection.adapter.authorizeEntityManipulation(this.el, sender)) {
	          var x = refGetNumeric(componentDataRef, 1);
	          var y = refGetNumeric(componentDataRef, 2);
	          var z = refGetNumeric(componentDataRef, 3);

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
	        var deletesOffset = FBMessage.createDeletesVector(flatbuilder, [deleteOffset]);
	        FBMessage.startMessage(flatbuilder);
	        FBMessage.addDeletes(flatbuilder, deletesOffset);
	        var messageOffset = FBMessage.endMessage(flatbuilder);

	        flatbuilder.finish(messageOffset);

	        NAF.connection.broadcastDataGuaranteed(typedArrayToBase64(flatbuilder.asUint8Array()));
	      } else {
	        NAF.log.error("Removing networked entity that is not in entities array.");
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
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.encode = exports.toObject = exports.builder = exports.toReference = void 0;
	/* eslint-disable @typescript-eslint/no-namespace */
	var builder_1 = __webpack_require__(40);
	var reference_1 = __webpack_require__(47);
	var reference_2 = __webpack_require__(47);
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
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Builder = void 0;
	var bit_width_1 = __webpack_require__(41);
	var bit_width_util_1 = __webpack_require__(42);
	var flexbuffers_util_1 = __webpack_require__(43);
	var value_type_1 = __webpack_require__(44);
	var value_type_util_1 = __webpack_require__(45);
	var stack_value_1 = __webpack_require__(46);
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
/* 41 */
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
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.paddingSize = exports.fromByteWidth = exports.uwidth = exports.fwidth = exports.iwidth = exports.toByteWidth = void 0;
	var bit_width_1 = __webpack_require__(41);
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
/* 43 */
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
/* 44 */
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
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.packedType = exports.fixedTypedVectorElementSize = exports.fixedTypedVectorElementType = exports.typedVectorElementType = exports.toTypedVector = exports.isAVector = exports.isFixedTypedVector = exports.isTypedVector = exports.isTypedVectorElement = exports.isIndirectNumber = exports.isNumber = exports.isInline = void 0;
	var value_type_1 = __webpack_require__(44);
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
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.StackValue = void 0;
	var bit_width_1 = __webpack_require__(41);
	var bit_width_util_1 = __webpack_require__(42);
	var value_type_1 = __webpack_require__(44);
	var value_type_util_1 = __webpack_require__(45);
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
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Reference = exports.toReference = void 0;
	var bit_width_util_1 = __webpack_require__(42);
	var value_type_1 = __webpack_require__(44);
	var value_type_util_1 = __webpack_require__(45);
	var reference_util_1 = __webpack_require__(48);
	var flexbuffers_util_1 = __webpack_require__(43);
	var bit_width_1 = __webpack_require__(41);
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
	            this._length = (0, reference_util_1.readUInt)(this.dataView, (0, reference_util_1.indirect)(this.dataView, this.offset, this.parentWidth) - this.byteWidth, (0, bit_width_util_1.fromByteWidth)(this.byteWidth));
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
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", { value: true });
	exports.keyForIndex = exports.valueForIndexWithKey = exports.diffKeys = exports.keyIndex = exports.indirect = exports.readFloat = exports.readUInt = exports.readInt = exports.validateOffset = void 0;
	var bit_width_1 = __webpack_require__(41);
	var bit_width_util_1 = __webpack_require__(42);
	var flexbuffers_util_1 = __webpack_require__(43);
	var reference_1 = __webpack_require__(47);
	var long_1 = __webpack_require__(27);
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
	    var step = readUInt(dataView, offset, width);
	    return offset - step;
	}
	exports.indirect = indirect;
	function keyIndex(key, dataView, offset, parentWidth, byteWidth, length) {
	    var input = (0, flexbuffers_util_1.toUTF8Array)(key);
	    var keysVectorOffset = indirect(dataView, offset, parentWidth) - byteWidth * 3;
	    var bitWidth = (0, bit_width_util_1.fromByteWidth)(byteWidth);
	    var indirectOffset = keysVectorOffset - readUInt(dataView, keysVectorOffset, bitWidth);
	    var _byteWidth = readUInt(dataView, keysVectorOffset + byteWidth, bitWidth);
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
	    var keyIndirectOffset = keyOffset - readUInt(dataView, keyOffset, (0, bit_width_util_1.fromByteWidth)(width));
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
	    var indirectOffset = keysVectorOffset - readUInt(dataView, keysVectorOffset, bitWidth);
	    var _byteWidth = readUInt(dataView, keysVectorOffset + byteWidth, bitWidth);
	    var keyOffset = indirectOffset + index * _byteWidth;
	    var keyIndirectOffset = keyOffset - readUInt(dataView, keyOffset, (0, bit_width_util_1.fromByteWidth)(_byteWidth));
	    var length = 0;
	    while (dataView.getUint8(keyIndirectOffset + length) !== 0) {
	        length++;
	    }
	    return (0, flexbuffers_util_1.fromUTF8Array)(new Uint8Array(dataView.buffer, dataView.byteOffset + keyIndirectOffset, length));
	}
	exports.keyForIndex = keyForIndex;

/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var flexbuffers = __webpack_require__(39);

	var _require = __webpack_require__(42),
	    fromByteWidth = _require.fromByteWidth;

	var _require2 = __webpack_require__(45),
	    isNumber = _require2.isNumber,
	    isIndirectNumber = _require2.isIndirectNumber,
	    isAVector = _require2.isAVector,
	    fixedTypedVectorElementSize = _require2.fixedTypedVectorElementSize,
	    isFixedTypedVector = _require2.isFixedTypedVector,
	    isTypedVector = _require2.isTypedVector,
	    typedVectorElementType = _require2.typedVectorElementType,
	    packedType = _require2.packedType,
	    fixedTypedVectorElementType = _require2.fixedTypedVectorElementType;

	var _require3 = __webpack_require__(48),
	    indirect = _require3.indirect,
	    keyForIndex = _require3.keyForIndex,
	    keyIndex = _require3.keyIndex,
	    readFloat = _require3.readFloat,
	    readInt = _require3.readInt,
	    readUInt = _require3.readUInt,
	    valueForIndexWithKey = _require3.valueForIndexWithKey;

	var _require4 = __webpack_require__(41),
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
	  return tmpRef.intValue();
	};

	var refGetNumeric = function refGetNumeric(ref, key) {
	  refCp(ref, tmpRef);
	  refAdvanceToIndexGet(tmpRef, key);
	  return tmpRef.numericValue();
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
	    target[i] = refGetInt(tmpRef2, i);
	  }

	  return target;
	};

	module.exports = { refReset: refReset, refAdvanceToIndexGet: refAdvanceToIndexGet, refGetBool: refGetBool, refGetInt: refGetInt, refGetNumeric: refGetNumeric, refGetString: refGetString, refGetUuidBytes: refGetUuidBytes, refCp: refCp, refGetToObject: refGetToObject };

/***/ }),
/* 50 */
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
/* 51 */
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
/* 52 */
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
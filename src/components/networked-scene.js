/* global AFRAME, NAF */

const Y = require('yjs')
const { Awareness } = require('y-protocols/awareness')

AFRAME.registerComponent('networked-scene', {
  schema: {
    app: {default: 'default'},
    room: {default: 'default'},
    connectOnLoad: {default: true},
    onConnect: {default: 'onConnect'},
    adapter: {default: 'wsEasyRtc'}, // See https://github.com/networked-aframe/networked-aframe#adapters for list of adapters
    adapterOptions: {
      default: {},
      parse: v => (typeof v === 'object' ? v : JSON.parse(v)),
      stringify: JSON.stringify
    },
    debug: {default: false}
  },

  init: function () {
    var el = this.el
    this.connect = this.connect.bind(this)
    el.addEventListener('connect', this.connect)
    if (this.data.connectOnLoad) {
      el.emit('connect', null, false)
    }
  },

  /**
   * Connect to signalling server and begin connecting to other clients
   */
  connect: function () {
    NAF.log.setDebug(this.data.debug)
    NAF.log.write('Networked-Aframe Connecting...')

    this.presence = new Awareness(new Y.Doc())
    this.checkDeprecatedProperties()
    this.setupNetworkAdapter()

    if (this.hasOnConnectFunction()) {
      this.callOnConnect()
    }

    return NAF.connection.connect(this.data.app, this.data.room, this.presence, this.data.adapterOptions)
  },

  checkDeprecatedProperties: function () {
    // No current
  },

  setupNetworkAdapter: function () {
    var adapterName = this.data.adapter
    var adapter = NAF.adapters.make(adapterName)
    var dataNetworkAdapter = NAF.adapters.make('p2pcf')
    NAF.connection.setNetworkAdapter(adapter, dataNetworkAdapter)
    this.el.emit('adapter-ready', adapter, false)
  },

  hasOnConnectFunction: function () {
    return this.data.onConnect !== '' && window.hasOwnProperty(this.data.onConnect)
  },

  callOnConnect: function () {
    NAF.connection.onConnect(window[this.data.onConnect])
  },

  remove: function () {
    NAF.log.write('networked-scene disconnected')
    this.el.removeEventListener('connect', this.connect)
    NAF.connection.disconnect()
    this.presence.destroy()
  }
})

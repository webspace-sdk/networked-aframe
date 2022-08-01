const P2PCFAdapter = require('./P2PCFAdapter')

class AdapterFactory {
  constructor () {
    this.adapters = { p2pcf: P2PCFAdapter }
    this.IS_CONNECTED = AdapterFactory.IS_CONNECTED
    this.CONNECTING = AdapterFactory.CONNECTING
    this.NOT_CONNECTED = AdapterFactory.NOT_CONNECTED
  }

  register (adapterName, AdapterClass) {
    this.adapters[adapterName] = AdapterClass
  }

  make (adapterName) {
    var name = adapterName.toLowerCase()
    if (this.adapters[name]) {
      var AdapterClass = this.adapters[name]
      return new AdapterClass()
    } else {
      throw new Error(
        'Adapter: ' +
          adapterName +
          ' not registered. Please use NAF.adapters.register() to register this adapter.'
      )
    }
  }
}

AdapterFactory.IS_CONNECTED = 'IS_CONNECTED'
AdapterFactory.CONNECTING = 'CONNECTING'
AdapterFactory.NOT_CONNECTED = 'NOT_CONNECTED'

module.exports = AdapterFactory

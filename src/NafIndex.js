const options = require('./options')
const utils = require('./utils')
const NafLogger = require('./NafLogger')
const Schemas = require('./Schemas')
const NetworkEntities = require('./NetworkEntities')
const NetworkConnection = require('./NetworkConnection')
const AdapterFactory = require('./adapters/AdapterFactory')

const naf = {}
naf.app = ''
naf.room = ''
naf.clientId = ''
naf.options = options
naf.utils = utils
naf.log = new NafLogger()
naf.schemas = new Schemas()
naf.version = '0.6.1'

naf.adapters = new AdapterFactory()
const entities = new NetworkEntities()
const connection = new NetworkConnection(entities)
naf.connection = connection
naf.entities = entities

module.exports = window.NAF = naf

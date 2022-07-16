/* global AFRAME, NAF */

const { Builder } = require('flatbuffers/js/builder');

var ReservedDataType = { Update: 'u', Remove: 'r' };

// Flatbuffers builder
const flatbuilder = new Builder(1024);

const FBMessage = require('./schema/networked-aframe/message').Message;
const FBCustomOp = require('./schema/networked-aframe/custom-op').CustomOp;

class NetworkConnection {

  constructor(networkEntities) {
    this.entities = networkEntities;
    this.dataChannelSubs = {};

    this.connectedClients = {};
    this.activeDataChannels = {};

    this._serverTimeRequests = 0;
    this._avgTimeOffset = 0;
    this._timeOffsets = [];
  }

  setNetworkAdapter(adapter) {
    this.adapter = adapter;
  }

  connect(serverUrl, appName, roomName, enableAudio = false) {
    NAF.app = appName;
    NAF.room = roomName;

    this.adapter.setApp(appName);

    this.adapter.setServerConnectListeners(
      this.connectSuccess.bind(this),
      this.connectFailure.bind(this)
    );
    this.adapter.setDataChannelListeners(
      this.dataChannelOpen.bind(this),
      this.dataChannelClosed.bind(this),
      this.receivedData.bind(this)
    );

    return this.updateTimeOffset()
      .then(() => this.adapter.connect())
      .then(() => this.adapter.joinRoom(roomName));
  }

  onConnect(callback) {
    this.onConnectCallback = callback;

    if (this.isConnected()) {
      callback();
    } else {
      document.body.addEventListener('connected', callback, false);
    }
  }

  connectSuccess(clientId) {
    NAF.log.write('Networked-Aframe Client ID:', clientId);
    NAF.clientId = clientId;

    var evt = new CustomEvent('connected', {'detail': { clientId: clientId }});
    document.body.dispatchEvent(evt);
  }

  connectFailure(errorCode, message) {
    NAF.log.error(errorCode, "failure to connect");
  }

  getConnectedClients() {
    return this.adapter.connectedClients;
  }

  isConnected() {
    return !!NAF.clientId;
  }

  isMineAndConnected(clientId) {
    return this.isConnected() && NAF.clientId === clientId;
  }

  isNewClient(clientId) {
    return !this.isConnectedTo(clientId);
  }

  isConnectedTo(clientId) {
    return this.adapter.getConnectStatus(clientId) === NAF.adapters.IS_CONNECTED;
  }

  dataChannelOpen(clientId) {
    NAF.log.write('Opened data channel from ' + clientId);
    this.activeDataChannels[clientId] = true;
    this.entities.completeSync(clientId, true);

    var evt = new CustomEvent('clientConnected', {detail: {clientId: clientId}});
    document.body.dispatchEvent(evt);
  }

  dataChannelClosed(clientId) {
    NAF.log.write('Closed data channel from ' + clientId);
    this.activeDataChannels[clientId] = false;
    this.entities.removeEntitiesOfClient(clientId);

    var evt = new CustomEvent('clientDisconnected', {detail: {clientId: clientId}});
    document.body.dispatchEvent(evt);
  }

  hasActiveDataChannel(clientId) {
    return this.activeDataChannels.hasOwnProperty(clientId) && this.activeDataChannels[clientId];
  }

  broadcastData(data) {
    this.adapter.broadcastData(data);
  }

  broadcastDataGuaranteed(data) {
    this.adapter.broadcastDataGuaranteed(data);
  }

  broadcastCustomData(dataType, customData, guaranteed) {
    this.fillBuilderWithCustomData(dataType, customData);

    if (guaranteed) {
      NAF.connection.broadcastDataGuaranteed(flatbuilder.asUint8Array());
    } else {
      NAF.connection.broadcastData(flatbuilder.asUint8Array());
    }
  }

  broadcastCustomDataGuaranteed(dataType, customData) {
    this.broadcastCustomData(dataType, customData, true);
  }

  sendData(data, toClientId, guaranteed) {
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

  sendDataGuaranteed(data, toClientId) {
    this.sendData(data, toClientId, true);
  }

  fillBuilderWithCustomData(dataType, customData) {
    flatbuilder.clear();

    const customOffset = FBCustomOp.createCustomOp(flatbuilder, 
      flatbuilder.createSharedString(dataType),
      flatbuilder.createString(JSON.stringify(customData))
    );

    const customsOffset = FBMessage.createCustomsVector(flatbuilder, [customOffset]);
    FBMessage.startMessage(flatbuilder);
    FBMessage.addCustoms(flatbuilder, customsOffset);
    const messageOffset = FBMessage.endMessage(flatbuilder);
    flatbuilder.finish(messageOffset);
  }

  sendCustomData(dataType, customData, toClientId, guaranteed = false) {
    this.fillBuilderWithCustomData(dataType, customData);

    if (guaranteed) {
      NAF.connection.sendDataGuaranteed(flatbuilder.asUint8Array(), toClientId);
    } else {
      NAF.connection.sendData(flatbuilder.asUint8Array(), toClientId);
    }
  }

  sendCustomDataGuaranteed(dataType, customData, toClientId) {
    this.sendCustomData(dataType, customData, toClientId, true);
  }

  subscribeToDataChannel(dataType, callback) {
    this.dataChannelSubs[dataType] = callback;
  }

  unsubscribeToDataChannel(dataType) {
    delete this.dataChannelSubs[dataType];
  }

  isReservedDataType(dataType) {
    return dataType == ReservedDataType.Update
        || dataType == ReservedDataType.Remove;
  }

  // Returns true if a new entity was created
  receivedData(data, sender) {
    AFRAME.scenes[0].systems.networked.enqueueIncoming(data, sender);
  }

  getServerTime() {
    return Date.now() + this._avgTimeOffset;
  }

  disconnect() {
    this.entities.removeRemoteEntities();
    this.adapter.disconnect();
    this.adapter.disconnect();

    NAF.app = '';
    NAF.room = '';
    NAF.clientId = '';
    this.activeDataChannels = {};
    this.adapter = null;
    this.adapter = null;
    AFRAME.scenes[0].systems.networked.reset();

    document.body.removeEventListener('connected', this.onConnectCallback);
  }

  updateTimeOffset() {
    return new Promise(res => {
      const clientSentTime = Date.now();

      fetch(document.location.href, {
        method: "HEAD",
        cache: "no-cache"
      }).then(res => {
        const precision = 1000;
        const serverReceivedTime = new Date(res.headers.get("Date")).getTime() + precision / 2;
        const clientReceivedTime = Date.now();
        const serverTime = serverReceivedTime + (clientReceivedTime - clientSentTime) / 2;
        const timeOffset = serverTime - clientReceivedTime;

        this._serverTimeRequests++;

        if (this._serverTimeRequests <= 10) {
          this._timeOffsets.push(timeOffset);
        } else {
          this._timeOffsets[this._serverTimeRequests % 10] = timeOffset;
        }

        this._avgTimeOffset = Math.floor(
          this._timeOffsets.reduce((acc, offset) => (acc += offset), 0) / this._timeOffsets.length
        );

        if (this._serverTimeRequests > 10) {
          setTimeout(() => this.updateTimeOffset(), 5 * 60 * 1000); // Sync clock every 5 minutes.
        } else {
          this.updateTimeOffset();
        }
      });
    });
  }
}

module.exports = NetworkConnection;

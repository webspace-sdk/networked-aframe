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
  }

  setNetworkAdapter(adapter) {
    this.adapter = adapter;
  }

  connect(serverUrl, appName, roomName, enableAudio = false) {
    NAF.app = appName;
    NAF.room = roomName;

    this.adapter.setServerUrl(serverUrl);
    this.adapter.setApp(appName);
    this.adapter.setRoom(roomName);

    this.adapter.setServerConnectListeners(
      this.connectSuccess.bind(this),
      this.connectFailure.bind(this)
    );
    this.adapter.setDataChannelListeners(
      this.dataChannelOpen.bind(this),
      this.dataChannelClosed.bind(this),
      this.receivedData.bind(this)
    );
    this.adapter.setRoomOccupantListener(this.occupantsReceived.bind(this));

    return this.adapter.connect();
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

  occupantsReceived(occupantList) {
    var prevConnectedClients = Object.assign({}, this.connectedClients);
    this.connectedClients = occupantList;
    this.checkForDisconnectingClients(prevConnectedClients, occupantList);
    this.checkForConnectingClients(occupantList);
  }

  checkForDisconnectingClients(oldOccupantList, newOccupantList) {
    for (var id in oldOccupantList) {
      var clientFound = newOccupantList.hasOwnProperty(id);
      if (!clientFound) {
        NAF.log.write('Closing stream to ', id);
        this.adapter.closeStreamConnection(id);
      }
    }
  }

  // Some adapters will handle this internally
  checkForConnectingClients(occupantList) {
    for (var id in occupantList) {
      var startConnection = this.isNewClient(id) && this.adapter.shouldStartConnectionTo(occupantList[id]);
      if (startConnection) {
        NAF.log.write('Opening datachannel to ', id);
        this.adapter.startStreamConnection(id);
      }
    }
  }

  getConnectedClients() {
    return this.connectedClients;
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
  receivedData(data, source, sender) {
    AFRAME.scenes[0].systems.networked.enqueueIncoming(data, source, sender);
  }

  getServerTime() {
    return this.adapter.getServerTime();
  }

  disconnect() {
    this.entities.removeRemoteEntities();
    this.adapter.disconnect();

    NAF.app = '';
    NAF.room = '';
    NAF.clientId = '';
    this.connectedClients = {};
    this.activeDataChannels = {};
    this.adapter = null;
    AFRAME.scenes[0].systems.networked.reset();

    document.body.removeEventListener('connected', this.onConnectCallback);
  }
}

module.exports = NetworkConnection;

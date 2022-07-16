const P2PT = require('./p2pt');
const { hexToBytes, bytesToHex } = require('../utils');

class P2PTAdapter {
  constructor() {
    this.room = null;
    this.clientId = null;
  }

  setRoom(room) {
    this.room = room;
  }

  setClientId(clientId) {
    this.clientId = clientId;
  }

setDataChannelListeners(onDataChannelOpen, onDataChannelClosed, onReceivedData) {
    this.onDataChannelOpen = onDataChannelOpen;
    this.onDataChannelClosed = onDataChannelClosed;
    this.onReceivedData = onReceivedData;
  }

  connect() {
    this.p2pt = new P2PT(
      [
      "wss://tracker.files.fm:7073/announce",
      "wss://tracker.btorrent.xyz",
      "wss://spacetradersapi-chatbox.herokuapp.com:443/announce",
      "wss://qot.abiir.top:443/announce",
      "ws://tracker.files.fm:7072/announce"
      ]
    )

    this.p2pt.setPeerIdBytes(new Uint8Array(hexToBytes(this.clientId)));

    this.p2pt.setIdentifier(`_jel_${this.room}`);

    this.p2pt.on('peerconnect', (peer) => {
      //this.p2pt.send(peer, flatbuilder.asUint8Array());
      this.onDataChannelOpen(peer.id);
    });

    this.p2pt.on('peerclose', (peer) => {
      this.onDataChannelClosed(peer.id);
    });

    this.p2pt.on('msg', (peer, msg) => {
      this.onReceivedData(msg, peer.id);
    });

    this.p2pt.start()
  }

  disconnect() {
    this.p2pt.destroy();
  }

  broadcastData(data) {
    this.p2pt.broadcast(data);
  }

  broadcastDataGuaranteed(data) {
    this.broadcastData(data);
  }

  sendData(data, toClientId) {
    const channels = this.p2pt.peers.get(toClientId);
    if (!channels) return;
    const peer = channels.find(p => p.connected);
    if (!peer) return;
    this.p2pt.send(peer, data);
  }

  sendDataGuaranteed(data, toClientId) {
    this.sendData(data, toClientId);
  }

  authorizeCreateEntity() {
    return true;
  }

  authorizeEntityManipulation() {
    return true;
  }

  sanitizeComponentValues() {
    return true;
  }
}

module.exports = P2PTAdapter;

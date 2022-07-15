const P2PT = require('./p2pt');

class P2PTAdapter {
  constructor() {
    this.p2pt = new P2PT(
      [
      "wss://tracker.files.fm:7073/announce",
      "wss://tracker.btorrent.xyz",
      "wss://spacetradersapi-chatbox.herokuapp.com:443/announce",
      "wss://qot.abiir.top:443/announce",
      "ws://tracker.files.fm:7072/announce"
      ]
    )

    this.room = null;
  }

  setRoom(room) {
    this.room = room;
  }

  setDataChannelListeners(onDataChannelOpen, onDataChannelClosed, onReceivedData) {
    this.onDataChannelOpen = onDataChannelOpen;
    this.onDataChannelClosed = onDataChannelClosed;
    this.onReceivedData = onReceivedData;
  }

  connect() {
    console.log("connect");
  }

  disconnect() {
    console.log("disc");
  }

  broadcastData(data) {
    console.log("broad", data);
  }

  broadcastDataGuaranteed(data) {
    console.log("broadg", data);
  }

  sendData(data, toClientId) {
    console.log("send", data);
  }

  sendDataGuaranteed(data, toClientId) {
    console.log("sendg", data);
  }
}

module.exports = P2PTAdapter;

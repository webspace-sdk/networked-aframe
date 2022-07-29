const P2PT = require('./p2pt');
const { hexToBytes } = require('../utils');

const TRACKER_LIST_FETCH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const TRACKER_LISTS = [
  "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all_ws.txt",
  "https://ngosang.github.io/trackerslist/trackers_all_ws.txt",
  "https://cdn.jsdelivr.net/gh/ngosang/trackerslist@master/trackers_all_ws.txt"
]

const FALLTHROUGH_TRACKERS = [
  "wss://tracker.files.fm:7073/announce",
  "wss://tracker.btorrent.xyz",
  "wss://spacetradersapi-chatbox.herokuapp.com:443/announce"
];

const trackerList = new Promise(res => {
  const lastTrackerList = localStorage.getItem("_trackerList");

  if (lastTrackerList) {
    const { trackers, lastFetchedAt } = JSON.parse(lastTrackerList);

    if (performance.now() - lastFetchedAt < TRACKER_LIST_FETCH_INTERVAL_MS) {
      return res(trackers);
    }
  }

  const finish = (response) => {
    response.text().then(text => {
      const trackers = text.split("\n").filter(x => x.trim().length > 0);
      localStorage.setItem("_trackerList", JSON.stringify({ lastFetchedAt: performance.now(), trackers }));

      res(trackers);
    });
  };

  // ugly w/e
  fetch(TRACKER_LISTS[0]).then(finish)
  .catch(() => {
    fetch(TRACKER_LISTS[1]).then(finish)
    .catch(() => {
      fetch(TRACKER_LISTS[2]).then(finish)
        .catch(() => res(FALLTHROUGH_TRACKERS))
    });
  })
});

class P2PTAdapter {
  constructor() {
    this.room = null;
    this.app = null;
    this.clientId = null;
    this.localMediaStream = null;
  }

  setApp(app) {
    this.app = app;
  }

  setClientId(clientId) {
    this.clientId = clientId;
  }

  setServerConnectListeners(onConnectSuccess, onConnectFailure) {
    this.onConnectSuccess = onConnectSuccess;
    this.onConnectFailure = onConnectFailure;
  }

  setDataChannelListeners(onDataChannelOpen, onDataChannelClosed, onReceivedData) {
    this.onDataChannelOpen = onDataChannelOpen;
    this.onDataChannelClosed = onDataChannelClosed;
    this.onReceivedData = onReceivedData;
  }

  connect() {
    return Promise.resolve();
  }

  getConnectedClients() {
    return this.p2pt.connectedClients;
  }

  joinRoom(room) {
    this.room = room;

    return new Promise(res => {
      trackerList.then(trackers => {
        this.leaveRoom();
      
        this.p2pt = new P2PT(trackers);

        this.p2pt.setPeerIdBytes(new Uint8Array(hexToBytes(this.clientId)));

        this.p2pt.setIdentifier(`_${this.app}_${this.room}`);

        this.p2pt.on('peerconnect', (peer) => {
          //this.p2pt.send(peer, flatbuilder.asUint8Array());
          this.onDataChannelOpen(peer.id);
        });

        this.p2pt.on('peerclose', (peer) => {
          this.onDataChannelClosed(peer.id);
        });

        this.p2pt.on('peersignal', (peer, { type }) => {
          if (type === "renegotiate") {

          } else if (type === "offer") {

          }

          console.log("signal", peer.id, offer);
        });

        this.p2pt.on('msg', (peer, msg) => {
          this.onReceivedData(msg, peer.id);
        });

        const onConnectHandler = () => {
          this.onConnectSuccess(this.clientId);
          this.p2pt.removeListener("trackerconnect", onConnectHandler);
          res();
        };

        this.p2pt.addListener("trackerconnect", onConnectHandler);

        this.p2pt.start();
      })
    });
  }

  leaveRoom(/* fireExitMessage */) {
    this.disconnect();
  }


  disconnect() {
    if (this.p2pt) {
      this.p2pt.destroy();
      this.p2pt = null;
    }
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

  setLocalMediaStream(stream) {
    if (this.localMediaStream && stream !== this.localMediaStream) {
      throw new Error("Adapter expects local media stream to not change");
    }

    if (stream !== null) {
      const oldStream = this.localMediaStream;
      this.updatePeerTracksForLocalMediaStream(oldStream);
      this.localMediaStream = stream;
    } else if (stream === null && this.localMediaStream) {
      this.removePeerTracksForLocalMediaStream();
      this.localMediaStream = null;
    }

    console.log("set local", stream);
  }

  enableMicrophone(enabled) {
    console.log("enabled mic", enabled);
  }

  removePeerTracksForLocalMediaStream() {
    for (const channels of this.p2pt.peers.values()) {
      for (const peer of channels.values()) {
        // Hacky, use internal map
        for (const existingTrack of peer._senderMap.keys()) {
            try {
              peer.removeTrack(existingTrack, this.localMediaStream);
            } catch(e) { // eslint-disable-line
          }
        }
      }
    }
  }

  updatePeerTracksForLocalMediaStream() {
    if (this.localMediaStream === null) return;

    const stream = this.localMediaStream;
    const tracks = stream.getTracks();

    for (const channels of this.p2pt.peers.values()) {
      for (const peer of channels.values()) {
        // Hacky, use internal map
        for (const existingTrack of peer._senderMap.keys()) {
          if (!tracks.includes(existingTrack)) {
            try {
              console.log("remove track");
              peer.removeTrack(existingTrack, stream);
            } catch(e) { // eslint-disable-line
            }
          }
        }

        for (const track of tracks) {
          if (peer._senderMap.has(track)) continue;
          console.log("add track");
          peer.addTrack(track, stream);
        }
      }
    }
  }

  getMediaStream(clientId, type /* "audio", "video" */) {
    return Promise.resolve();
  }

  setOutgoingVisemeBuffer() {

  }

  getCurrentViseme() {

  }

  block() {
    // TODO remove call sites?
  }

  unblock() {
    // TODO remove call sites?
  }

  kick() {
    // TODO
  }

  // fire event video_stream_changed, audio_stream_changed on body
  // onAudioStreamChanged: async function({ detail: { peerId } }) {
}

module.exports = P2PTAdapter;

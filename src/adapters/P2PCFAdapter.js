const P2PCF = require('p2pcf').default

class P2PCFAdapter {
  constructor () {
    this.room = null
    this.app = null
    this.clientId = null
    this.localMediaStream = null
  }

  setApp (app) {
    this.app = app
  }

  setClientId (clientId) {
    this.clientId = clientId
  }

  setServerConnectListeners (onConnectSuccess, onConnectFailure) {
    this.onConnectSuccess = onConnectSuccess
    this.onConnectFailure = onConnectFailure
  }

  setDataChannelListeners (onDataChannelOpen, onDataChannelClosed, onReceivedData) {
    this.onDataChannelOpen = onDataChannelOpen
    this.onDataChannelClosed = onDataChannelClosed
    this.onReceivedData = onReceivedData
  }

  connect () {
    return Promise.resolve()
  }

  getConnectedClients () {
    return this.p2pcf.connectedClients
  }

  joinRoom (room) {
    this.room = room

    return new Promise(resolve => {
      this.leaveRoom()

      this.p2pcf = new P2PCF(this.clientId, this.room)

      this.p2pcf.on('peerconnect', (peer) => {
        // this.p2pcf.send(peer, flatbuilder.asUint8Array());
        this.onDataChannelOpen(peer.client_id)
      })

      this.p2pcf.on('peerclose', (peer) => {
        this.onDataChannelClosed(peer.client_id)
      })

      this.p2pcf.on('msg', (peer, msg) => {
        this.onReceivedData(new Uint8Array(msg), peer.client_id)
      })

      this.p2pcf.start()

      this.onConnectSuccess(this.clientId)
    })
  }

  leaveRoom (/* fireExitMessage */) {
    this.disconnect()
  }

  disconnect () {
    if (this.p2pcf) {
      this.p2pcf.destroy()
      this.p2pcf = null
    }
  }

  broadcastData (data) {
    this.p2pcf.broadcast(data)
  }

  broadcastDataGuaranteed (data) {
    this.broadcastData(data)
  }

  sendData (data, toClientId) {
    const peer = this.p2pcf.peers.get(toClientId)
    if (!peer) return
    this.p2pcf.send(peer, data)
  }

  sendDataGuaranteed (data, toClientId) {
    this.sendData(data, toClientId)
  }

  authorizeCreateEntity () {
    return true
  }

  authorizeEntityManipulation () {
    return true
  }

  sanitizeComponentValues () {
    return true
  }

  setLocalMediaStream (stream) {
    if (this.localMediaStream && stream !== this.localMediaStream) {
      throw new Error('Adapter expects local media stream to not change')
    }

    if (stream !== null) {
      const oldStream = this.localMediaStream
      this.updatePeerTracksForLocalMediaStream(oldStream)
      this.localMediaStream = stream
    } else if (stream === null && this.localMediaStream) {
      this.removePeerTracksForLocalMediaStream()
      this.localMediaStream = null
    }

    console.log('set local', stream)
  }

  enableMicrophone (enabled) {
    console.log('enabled mic', enabled)
  }

  removePeerTracksForLocalMediaStream () {
    for (const peer of this.p2pcf.peers.values()) {
      // Hacky, use internal map
      for (const existingTrack of peer._senderMap.keys()) {
        try {
          peer.removeTrack(existingTrack, this.localMediaStream)
          } catch(e) { // eslint-disable-line
        }
      }
    }
  }

  updatePeerTracksForLocalMediaStream () {
    if (this.localMediaStream === null) return

    const stream = this.localMediaStream
    const tracks = stream.getTracks()

    for (const peer of this.p2pcf.peers.values()) {
      // Hacky, use internal map
      for (const existingTrack of peer._senderMap.keys()) {
        if (!tracks.includes(existingTrack)) {
          try {
            console.log('remove track')
            peer.removeTrack(existingTrack, stream)
          } catch(e) { // eslint-disable-line
          }
        }
      }

      for (const track of tracks) {
        if (peer._senderMap.has(track)) continue
        console.log('add track')
        peer.addTrack(track, stream)
      }
    }
  }

  getMediaStream (clientId, type /* "audio", "video" */) {
    return Promise.resolve()
  }

  setOutgoingVisemeBuffer () {

  }

  getCurrentViseme () {

  }

  block () {
    // TODO remove call sites?
  }

  unblock () {
    // TODO remove call sites?
  }

  kick () {
    // TODO
  }

  // fire event video_stream_changed, audio_stream_changed on body
  // onAudioStreamChanged: async function({ detail: { peerId } }) {
}

module.exports = P2PCFAdapter

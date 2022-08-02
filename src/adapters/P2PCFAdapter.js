/* globals CustomEvent, MediaStream */
const P2PCF = require('p2pcf').default

class P2PCFAdapter {
  constructor () {
    this.room = null
    this.app = null
    this.clientId = null
    this.localMediaStream = null
    this.audioTracks = new Map()
    this.videoTracks = new Map()
    this.pendingMediaRequests = new Map()
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

        peer.on('track', track => {
          switch (track.kind) {
            case 'video':
              this.videoTracks.set(peer.id, track)
              document.body.dispatchEvent(new CustomEvent('video_stream_changed', { detail: { peerId: peer.client_id } }))
              break
            case 'audio':
              this.audioTracks.set(peer.id, track)
              document.body.dispatchEvent(new CustomEvent('audio_stream_changed', { detail: { peerId: peer.client_id } }))
              break
          }

          this.resolvePendingMediaRequestForTrack(peer.client_id, track)
        })
      })

      this.p2pcf.on('peerclose', (peer) => {
        this.onDataChannelClosed(peer.client_id)

        const pendingMediaRequests = this.pendingMediaRequests.get(peer.client_id)

        if (pendingMediaRequests) {
          if (pendingMediaRequests.audio) {
            pendingMediaRequests.audio.resolve(null)
          }

          if (pendingMediaRequests.video) {
            pendingMediaRequests.video.resolve(null)
          }

          this.pendingMediaRequests.delete(peer.client_id)
        }
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

      for (const track in stream.getTracks()) {
        this.resolvePendingMediaRequestForTrack(this.clientId, track)
      }
    } else if (stream === null && this.localMediaStream) {
      this.removePeerTracksForLocalMediaStream()
      this.localMediaStream = null
    }
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
            peer.removeTrack(existingTrack, stream)
          } catch(e) { // eslint-disable-line
          }
        }
      }

      for (const track of tracks) {
        if (peer._senderMap.has(track)) continue
        peer.addTrack(track, stream)
      }
    }
  }

  getMediaStream (clientId, kind = 'audio') {
    let track

    switch (kind) {
      case 'audio':
        track = this.audioTracks.get(clientId)
        break
      case 'video':
        track = this.videoTracks.get(clientId)
        break
    }

    if (track) {
      return Promise.resolve(new MediaStream([track]))
    } else {
      if (!this.pendingMediaRequests.has(clientId)) {
        this.pendingMediaRequests.set(clientId, {})
      }

      const requests = this.pendingMediaRequests.get(clientId)
      const promise = new Promise((resolve, reject) => (requests[kind] = { resolve, reject }))
      requests[kind].promise = promise
      promise.catch(e => console.warn(`${clientId} getMediaStream Error`, e))
      return promise
    }
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

  resolvePendingMediaRequestForTrack (clientId, track) {
    const requests = this.pendingMediaRequests.get(clientId)

    if (requests && requests[track.kind]) {
      const resolve = requests[track.kind].resolve
      delete requests[track.kind]
      resolve(new MediaStream([track]))
    }

    if (requests && Object.keys(requests).length === 0) {
      this.pendingMediaRequests.delete(clientId)
    }
  }
}

module.exports = P2PCFAdapter

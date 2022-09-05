/* globals CustomEvent, MediaStream, RTCRtpSender, performance, TransformStream */
const P2PCF = require('p2pcf').default
const sdpTransform = require('sdp-transform')
const { EventTarget } = require('event-target-shim')

// Use reliable channel, which is automatically chunked, for long messages
const MAX_UNRELIABLE_MESSAGE_LENGTH_BYTES = 16000

// If the browser supports insertable streams, we insert a 5 byte payload at the end of the voice
// frame encoding 4 magic bytes and 1 viseme byte. This is a hack because on older browsers
// this data will be injested into the codec, but since the values are near zero it seems to have
// minimal effect. (Eventually all browsers will support insertable streams.)
const supportsInsertableStreams = (window.RTCRtpSender && !!RTCRtpSender.prototype.createEncodedStreams)
const visemeMagicBytes = [0x00, 0x00, 0x00, 0x01] // Bytes to add to end of frame to indicate a viseme will follow

const rtcPeerConnectionProprietaryConstraints = {
  optional: [{ googDscp: true }]
}

const sdpTransformConfigureCodecs = sdp => {
  const isOffer = sdp.indexOf('actpass') !== -1
  const parsedSdp = sdpTransform.parse(sdp)
  for (let i = 0; i < parsedSdp.media.length; i++) {
    for (let j = 0; j < parsedSdp.media[i].fmtp.length; j++) {
      if (parsedSdp.media[i].type === 'audio' && parsedSdp.media[i].fmtp[j].config.indexOf('=') !== -1) {
        parsedSdp.media[i].fmtp[j].config += ';stereo=0;maxaveragebitrate=64000;cbr=0;usetx=1;'

        if (isOffer) {
          parsedSdp.media[i].fmtp[j].config += 'sprop-stereo=0;'
        }
      } else if (parsedSdp.media[i].type === 'video' && parsedSdp.media[i].fmtp[j].config.indexOf('=') !== -1) {
        parsedSdp.media[i].fmtp[j].config += ';x-google-start-bitrate=1000;'
      }
    }
  }

  return sdpTransform.write(parsedSdp)
}

class P2PCFAdapter extends EventTarget {
  constructor () {
    super()

    this.room = null
    this.app = null
    this.clientId = null
    this.localMediaStream = null
    this.unreliableChannels = new Map()
    this.audioTracks = new Map()
    this.videoTracks = new Map()
    this.pendingMediaRequests = new Map()
    this.visemeMap = new Map()
    this.visemeTimestamps = new Map()
    this.micEnabled = false
    this.type = 'p2pcf'
    this.workerUrl = 'https://webspace-worker.minddrop.workers.dev'
  }

  setWorkerUrl (workerUrl) {
    this.workerUrl = workerUrl
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
    return this.p2pcf.connectedSessions
  }

  joinRoom (room) {
    this.room = room

    return new Promise(resolve => {
      this.leaveRoom()

      this.p2pcf = new P2PCF(this.clientId, this.room,
        {
          workerUrl: this.workerUrl,
          rtcPeerConnectionOptions: {
            rtcpMuxPolicy: 'require',
            sdpSemantics: 'unified-plan',
            encodedInsertableStreams: supportsInsertableStreams
          },
          rtcPeerConnectionProprietaryConstraints,
          fastPollingRateMs: 250,
          sdpTransform: sdpTransformConfigureCodecs
        })

      this.p2pcf.on('peerconnect', (peer) => {
        this.onDataChannelOpen(peer.client_id)
        this.updatePeerTracksForLocalMediaStream(peer)

        // Unrelible DC is ordered, which is going to lean on the assumption
        // that late arriving packets will be out of date. This assumption will
        // fail for packets that arrive late that have unreliable updates
        // for multiple objects.
        const unreliableChannel = peer._pc.createDataChannel(peer.channelName + '-unreliable', { ordered: true, maxRetransmits: 0, id: peer._channel.id + 1, negotiated: true })
        unreliableChannel.binaryType = 'arraybuffer'
        unreliableChannel.onmessage = event => peer._onChannelMessage(event)
        unreliableChannel.onopen = () =>
          this.unreliableChannels.set(peer.client_id, unreliableChannel)

        unreliableChannel.onclose = () =>
          this.unreliableChannels.delete(peer.client_id)

        unreliableChannel.onerror = () =>
          this.unreliableChannels.delete(peer.client_id)

        peer.on('track', (track, stream, receiver) => {
          switch (track.kind) {
            case 'video':
              this.videoTracks.set(peer.client_id, track)
              this.dispatchEvent(new CustomEvent('video_stream_changed', { detail: { peerId: peer.client_id } }))
              if (supportsInsertableStreams) {
                const receiverStreams = receiver.createEncodedStreams()
                receiverStreams.readable.pipeTo(receiverStreams.writable)
              }
              break
            case 'audio':
              this.audioTracks.set(peer.client_id, track)

              if (supportsInsertableStreams) {
                // Add viseme decoder
                const self = this

                const receiverTransform = new TransformStream({
                  start () {},
                  flush () {},

                  async transform (encodedFrame, controller) {
                    if (encodedFrame.data.byteLength < visemeMagicBytes.length + 1) {
                      controller.enqueue(encodedFrame)
                    } else {
                      const view = new DataView(encodedFrame.data)
                      let hasViseme = true

                      for (let i = 0, l = visemeMagicBytes.length; i < l; i++) {
                        if (
                          view.getUint8(encodedFrame.data.byteLength - 1 - visemeMagicBytes.length + i) !==
                          visemeMagicBytes[i]
                        ) {
                          hasViseme = false
                        }
                      }

                      if (hasViseme) {
                        const viseme = view.getInt8(encodedFrame.data.byteLength - 1)
                        self.visemeMap.set(peer.client_id, viseme)
                        self.visemeTimestamps.set(peer.client_id, performance.now())

                        encodedFrame.data = encodedFrame.data.slice(
                          0,
                          encodedFrame.data.byteLength - 1 - visemeMagicBytes.length
                        )
                      }

                      controller.enqueue(encodedFrame)
                    }
                  }
                })

                const receiverStreams = receiver.createEncodedStreams()
                receiverStreams.readable.pipeThrough(receiverTransform).pipeTo(receiverStreams.writable)
              }
              this.dispatchEvent(new CustomEvent('audio_stream_changed', { detail: { peerId: peer.client_id } }))
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

      this.p2pcf.start().then(() => {
        this.onConnectSuccess(this.clientId)
        resolve()
      })
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

  broadcastData (data, guaranteed = false) {
    let sendUnreliable = !guaranteed && data.byteLength < MAX_UNRELIABLE_MESSAGE_LENGTH_BYTES

    if (sendUnreliable) {
      for (const peer of this.p2pcf.peers.values()) {
        if (this.unreliableChannels.has(peer.client_id)) continue
        sendUnreliable = false
        break
      }
    }

    if (sendUnreliable) {
      for (const channel of this.unreliableChannels.values()) {
        channel.send(data)
      }
    } else {
      this.p2pcf.broadcast(data)
    }
  }

  broadcastDataGuaranteed (data) {
    this.broadcastData(data, true)
  }

  sendData (data, toClientId, guaranteed = false) {
    for (const peer of this.p2pcf.peers.values()) {
      if (peer.client_id === toClientId) {
        if (!guaranteed && this.unreliableChannels.has(toClientId)) {
          this.unreliableChannels.get(toClientId).send(data)
        } else {
          this.p2pcf.send(peer, data)
        }

        break
      }
    }
  }

  sendDataGuaranteed (data, toClientId) {
    this.sendData(data, toClientId, true)
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
      let oldStream = this.localMediaStream
      this.localMediaStream = stream

      for (const track of stream.getTracks()) {
        const map = (track.kind === 'audio' ? this.audioTracks : this.videoTracks)
        map.set(this.clientId, track)
        this.resolvePendingMediaRequestForTrack(this.clientId, track)
      }

      this.updatePeerTracksForLocalMediaStream(null, oldStream)
    } else if (stream === null && this.localMediaStream) {
      this.removePeerTracksForLocalMediaStream()
      this.localMediaStream = null
    }
  }

  enableMicrophone (enabled) {
    this.micEnabled = enabled
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

  updatePeerTracksForLocalMediaStream (peerToUpdate = null, oldStream = null) {
    if (this.localMediaStream === null) return

    const stream = this.localMediaStream
    const tracks = stream.getTracks()

    for (const peer of this.p2pcf.peers.values()) {
      if (peerToUpdate && peerToUpdate !== peer) continue

      // Hacky, use internal map
      for (const existingTrack of peer._senderMap.keys()) {
        if (!tracks.includes(existingTrack)) {
          try {
            peer.removeTrack(existingTrack, oldStream || stream)
          } catch(e) { // eslint-disable-line
          }
        }
      }

      for (const track of tracks) {
        if (peer._senderMap.has(track)) continue
        peer.addTrack(track, stream)

        const sender = peer._senderMap.get(track).get(stream)

        if (track.kind === 'audio') {
          if (supportsInsertableStreams) {
            const self = this

            // Add viseme encoder
            const senderTransform = new TransformStream({
              start () {
                // Called on startup.
              },

              async transform (encodedFrame, controller) {
                if (encodedFrame.data.byteLength < 2) {
                  controller.enqueue(encodedFrame)
                  return
                }

                // Create a new buffer with 1 byte for viseme.
                const newData = new ArrayBuffer(encodedFrame.data.byteLength + 1 + visemeMagicBytes.length)
                const arr = new Uint8Array(newData)
                arr.set(new Uint8Array(encodedFrame.data), 0)

                for (let i = 0, l = visemeMagicBytes.length; i < l; i++) {
                  arr[encodedFrame.data.byteLength + i] = visemeMagicBytes[i]
                }

                if (self.outgoingVisemeBuffer) {
                  const viseme = self.micEnabled ? self.outgoingVisemeBuffer[0] : 0
                  arr[encodedFrame.data.byteLength + visemeMagicBytes.length] = viseme
                  self.visemeMap.set(self.clientId, viseme)
                  self.visemeTimestamps.set(self.clientId, performance.now())
                }

                encodedFrame.data = newData
                controller.enqueue(encodedFrame)
              },

              flush () {
                      // Called when the stream is about to be closed.
              }
            })

            const senderStreams = sender.createEncodedStreams()
            senderStreams.readable.pipeThrough(senderTransform).pipeTo(senderStreams.writable)
          }
        } else {
          const senderStreams = sender.createEncodedStreams()
          senderStreams.readable.pipeTo(senderStreams.writable)
        }
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

  setOutgoingVisemeBuffer (buffer) {
    this.outgoingVisemeBuffer = buffer
  }

  getCurrentViseme (clientId) {
    if (clientId === this.clientId && this.outgoingVisemeBuffer) {
      return this.outgoingVisemeBuffer[0]
    }

    if (!this.visemeMap.has(clientId)) return 0

    // If last viseme was longer than 1s ago, the producer was paused.
    if (this.visemeTimestamps.has(clientId) && performance.now() - 1000 >= this.visemeTimestamps.get(clientId)) return 0

    return this.visemeMap.get(clientId)
  }
}

module.exports = P2PCFAdapter

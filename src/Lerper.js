/* global THREE */
const LERP_FRAMES = 30;
const TYPE_POSITION = 0x1;
const TYPE_QUATERNION = 0x2;
const TYPE_SCALE = 0x4;

const tmpQuaternion = new THREE.Quaternion();

// Performs lerp/slerp on frames
class Lerper {
  constructor(fps = 10, maxLerpDistance = 100000.0, jitterTolerance = 3.0) {
    this.frames = [];
    this.frameIndex = -1;
    this.running = false;
    this.firstTypeFlags = 0;
    this.maxLerpDistanceSq = maxLerpDistance * maxLerpDistance;

    for (let i = 0; i < LERP_FRAMES; i++) {
      // Frames are:
      // time
      // type flags
      // pos x y z
      // quat x y z w
      // scale x y z
      this.frames.push([0, 0, 0.0, 0.0, 0.0, 0.0, 0.0 ,0.0, 0.0, 1.0, 1.0, 1.0]);
    }

    this.bufferTimeMs = (1000 / fps) * jitterTolerance;
  }

  reset() {
    this.frameIndex = -1;
    this.firstTypeFlags = 0;

    for (let i = 0; i < this.frames.length; i++) {
      this.frames[i][0] = 0;
    }
  }

  lerp(start, end, t) {
    return start + (end - start) * t;
  }

  startFrame() {
    this.running = true;
    this.frameIndex = (this.frameIndex + 1) % this.frames.length;

    const frame = this.frames[this.frameIndex];
    frame[0] = performance.now();
    frame[1] = 0; // Flags
    frame[2] = 0.0;
    frame[3] = 0.0;
    frame[4] = 0.0;
    frame[5] = 0.0;
    frame[6] = 0.0;
    frame[7] = 0.0;
    frame[8] = 0.0;
    frame[9] = 1.0;
    frame[10] = 1.0;
    frame[11] = 1.0;
  }

  setPosition(x, y, z) {
    const frame = this.frames[this.frameIndex];
    frame[1] |= TYPE_POSITION;
    frame[2] = x;
    frame[3] = y;
    frame[4] = z;
  }

  setQuaternion(x, y, z, w) {
    const frame = this.frames[this.frameIndex];
    frame[1] |= TYPE_QUATERNION;
    frame[5] = x;
    frame[6] = y;
    frame[7] = z;
    frame[8] = w;
  }

  setScale(x, y, z) {
    const frame = this.frames[this.frameIndex];
    frame[1] |= TYPE_SCALE;
    frame[9] = x;
    frame[10] = y;
    frame[11] = z;
  }

  step(type, target) {
    if (!this.running) return;

    const { frames } = this;
    if (this.frameIndex === -1) return;

    const serverTime = performance.now() - this.bufferTimeMs;
    let olderFrame;
    let newerFrame;

    for (let i = frames.length; i >= 1; i--) {
      const idx = (this.frameIndex + i) % this.frames.length;
      const frame = frames[idx];

      if (frame[0] !== 0 && frame[1] & type) {
        if ((this.firstTypeFlags & type) === 0) {
          this.firstTypeFlags |= type;

          // First frame.
          if (type === TYPE_POSITION) {
            target.x = frame[2];
            target.y = frame[3];
            target.z = frame[4];
          } else if (type === TYPE_QUATERNION) {
            target.x = frame[5];
            target.y = frame[6];
            target.z = frame[7];
            target.w = frame[8];
          } else if (type === TYPE_SCALE) {
            target.x = frame[9];
            target.y = frame[10];
            target.z = frame[11];
          }

          return true;
        }

        if (frame[0] <= serverTime) {
          olderFrame = frame;

          for (let j = 1; j < frames.length; j++) {
            const nidx = (idx + j) % this.frames.length;
            // Find the next frame that has this type (pos, rot, scale)
            if (frames[nidx][1] & type && frames[nidx][0] !== 0 && frames[nidx][0] > olderFrame[0]) {
              newerFrame = frames[nidx];
              break;
            }
          }

          break;
        }
      }
    }

    if (!olderFrame || !newerFrame) return;

    const t0 = newerFrame[0];
    const t1 = olderFrame[0];

    // THE TIMELINE
    // t = time (serverTime)
    // p = entity position
    // ------ t1 ------ tn --- t0 ----->> NOW
    // ------ p1 ------ pn --- p0 ----->> NOW
    // ------ 0% ------ x% --- 100% --->> NOW
    const zeroPercent = serverTime - t1;
    const hundredPercent = t0 - t1;
    const pPercent = zeroPercent / hundredPercent;

    if (type === TYPE_POSITION) {
      const oX = olderFrame[2];
      const oY = olderFrame[3];
      const oZ = olderFrame[4];

      const nX = newerFrame[2];
      const nY = newerFrame[3];
      const nZ = newerFrame[4];

      const dx = oX - nX;
      const dy = oY - nY;
      const dz = oZ - nZ;

      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq >= this.maxLerpDistanceSq) {
        target.x = nX;
        target.y = nY;
        target.z = nZ;
      } else {
        target.x = this.lerp(oX, nX, pPercent);
        target.y = this.lerp(oY, nY, pPercent);
        target.z = this.lerp(oZ, nZ, pPercent);
      }
    } else if (type === TYPE_QUATERNION) {
      target.x = olderFrame[5];
      target.y = olderFrame[6];
      target.z = olderFrame[7];
      target.w = olderFrame[8];
      tmpQuaternion.x = newerFrame[5];
      tmpQuaternion.y = newerFrame[6];
      tmpQuaternion.z = newerFrame[7];
      tmpQuaternion.w = newerFrame[8];
      target.slerp(tmpQuaternion, pPercent);
    } else if (type === TYPE_SCALE) {
      target.x = this.lerp(olderFrame[9], newerFrame[9], pPercent);
      target.y = this.lerp(olderFrame[10], newerFrame[10], pPercent);
      target.z = this.lerp(olderFrame[11], newerFrame[11], pPercent);
    }

    if (olderFrame && olderFrame[0] !== 0 && serverTime - olderFrame[0] > 5000.0) {
      // Optimization, stop doing work after older frame is more than 5 seconds old.
      this.running = false;
    }

    return true;
  }
}

module.exports = {
  Lerper,
  TYPE_POSITION,
  TYPE_QUATERNION,
  TYPE_SCALE
}

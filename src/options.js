var options = {
  debug: false,
  updateRate: 15, // How often network components call `sync`
  useLerp: true, // lerp position, rotation, and scale components on networked entities.
  maxLerpDistance: null, // max distance to perform lerping
  firstSyncSource: null, // If specified, only allow first syncs from this source.
  syncSource: null, // If specified, only allow syncs from this source.
};
module.exports = options;

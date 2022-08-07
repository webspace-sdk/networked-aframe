"use strict";
// automatically generated by the FlatBuffers compiler, do not modify
exports.__esModule = true;
exports.PresenceUpdateRequestT = exports.PresenceUpdateRequest = void 0;
var flatbuffers = require("flatbuffers");
var PresenceUpdateRequest = /** @class */ (function () {
    function PresenceUpdateRequest() {
        this.bb = null;
        this.bb_pos = 0;
    }
    PresenceUpdateRequest.prototype.__init = function (i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    };
    PresenceUpdateRequest.getRootAsPresenceUpdateRequest = function (bb, obj) {
        return (obj || new PresenceUpdateRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    };
    PresenceUpdateRequest.getSizePrefixedRootAsPresenceUpdateRequest = function (bb, obj) {
        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
        return (obj || new PresenceUpdateRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    };
    PresenceUpdateRequest.startPresenceUpdateRequest = function (builder) {
        builder.startObject(0);
    };
    PresenceUpdateRequest.endPresenceUpdateRequest = function (builder) {
        var offset = builder.endObject();
        return offset;
    };
    PresenceUpdateRequest.createPresenceUpdateRequest = function (builder) {
        PresenceUpdateRequest.startPresenceUpdateRequest(builder);
        return PresenceUpdateRequest.endPresenceUpdateRequest(builder);
    };
    PresenceUpdateRequest.prototype.unpack = function () {
        return new PresenceUpdateRequestT();
    };
    PresenceUpdateRequest.prototype.unpackTo = function (_o) { };
    return PresenceUpdateRequest;
}());
exports.PresenceUpdateRequest = PresenceUpdateRequest;
var PresenceUpdateRequestT = /** @class */ (function () {
    function PresenceUpdateRequestT() {
    }
    PresenceUpdateRequestT.prototype.pack = function (builder) {
        return PresenceUpdateRequest.createPresenceUpdateRequest(builder);
    };
    return PresenceUpdateRequestT;
}());
exports.PresenceUpdateRequestT = PresenceUpdateRequestT;

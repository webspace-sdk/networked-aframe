"use strict";
// automatically generated by the FlatBuffers compiler, do not modify
exports.__esModule = true;
exports.PresenceUpdateT = exports.PresenceUpdate = void 0;
var flatbuffers = require("flatbuffers");
var PresenceUpdate = /** @class */ (function () {
    function PresenceUpdate() {
        this.bb = null;
        this.bb_pos = 0;
    }
    PresenceUpdate.prototype.__init = function (i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    };
    PresenceUpdate.getRootAsPresenceUpdate = function (bb, obj) {
        return (obj || new PresenceUpdate()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    };
    PresenceUpdate.getSizePrefixedRootAsPresenceUpdate = function (bb, obj) {
        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
        return (obj || new PresenceUpdate()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    };
    PresenceUpdate.prototype.update = function (index) {
        var offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
    };
    PresenceUpdate.prototype.updateLength = function () {
        var offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    };
    PresenceUpdate.prototype.updateArray = function () {
        var offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? new Uint8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    };
    PresenceUpdate.startPresenceUpdate = function (builder) {
        builder.startObject(1);
    };
    PresenceUpdate.addUpdate = function (builder, updateOffset) {
        builder.addFieldOffset(0, updateOffset, 0);
    };
    PresenceUpdate.createUpdateVector = function (builder, data) {
        builder.startVector(1, data.length, 1);
        for (var i = data.length - 1; i >= 0; i--) {
            builder.addInt8(data[i]);
        }
        return builder.endVector();
    };
    PresenceUpdate.startUpdateVector = function (builder, numElems) {
        builder.startVector(1, numElems, 1);
    };
    PresenceUpdate.endPresenceUpdate = function (builder) {
        var offset = builder.endObject();
        return offset;
    };
    PresenceUpdate.createPresenceUpdate = function (builder, updateOffset) {
        PresenceUpdate.startPresenceUpdate(builder);
        PresenceUpdate.addUpdate(builder, updateOffset);
        return PresenceUpdate.endPresenceUpdate(builder);
    };
    PresenceUpdate.prototype.unpack = function () {
        return new PresenceUpdateT(this.bb.createScalarList(this.update.bind(this), this.updateLength()));
    };
    PresenceUpdate.prototype.unpackTo = function (_o) {
        _o.update = this.bb.createScalarList(this.update.bind(this), this.updateLength());
    };
    return PresenceUpdate;
}());
exports.PresenceUpdate = PresenceUpdate;
var PresenceUpdateT = /** @class */ (function () {
    function PresenceUpdateT(update) {
        if (update === void 0) { update = []; }
        this.update = update;
    }
    PresenceUpdateT.prototype.pack = function (builder) {
        var update = PresenceUpdate.createUpdateVector(builder, this.update);
        return PresenceUpdate.createPresenceUpdate(builder, update);
    };
    return PresenceUpdateT;
}());
exports.PresenceUpdateT = PresenceUpdateT;

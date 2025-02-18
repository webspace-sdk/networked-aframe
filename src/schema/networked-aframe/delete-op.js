"use strict";
// automatically generated by the FlatBuffers compiler, do not modify
exports.__esModule = true;
exports.DeleteOpT = exports.DeleteOp = void 0;
var flatbuffers = require("flatbuffers");
var DeleteOp = /** @class */ (function () {
    function DeleteOp() {
        this.bb = null;
        this.bb_pos = 0;
    }
    DeleteOp.prototype.__init = function (i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    };
    DeleteOp.getRootAsDeleteOp = function (bb, obj) {
        return (obj || new DeleteOp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    };
    DeleteOp.getSizePrefixedRootAsDeleteOp = function (bb, obj) {
        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
        return (obj || new DeleteOp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    };
    DeleteOp.prototype.networkId = function (optionalEncoding) {
        var offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    };
    DeleteOp.startDeleteOp = function (builder) {
        builder.startObject(1);
    };
    DeleteOp.addNetworkId = function (builder, networkIdOffset) {
        builder.addFieldOffset(0, networkIdOffset, 0);
    };
    DeleteOp.endDeleteOp = function (builder) {
        var offset = builder.endObject();
        builder.requiredField(offset, 4); // network_id
        return offset;
    };
    DeleteOp.createDeleteOp = function (builder, networkIdOffset) {
        DeleteOp.startDeleteOp(builder);
        DeleteOp.addNetworkId(builder, networkIdOffset);
        return DeleteOp.endDeleteOp(builder);
    };
    DeleteOp.prototype.unpack = function () {
        return new DeleteOpT(this.networkId());
    };
    DeleteOp.prototype.unpackTo = function (_o) {
        _o.networkId = this.networkId();
    };
    return DeleteOp;
}());
exports.DeleteOp = DeleteOp;
var DeleteOpT = /** @class */ (function () {
    function DeleteOpT(networkId) {
        if (networkId === void 0) { networkId = null; }
        this.networkId = networkId;
    }
    DeleteOpT.prototype.pack = function (builder) {
        var networkId = (this.networkId !== null ? builder.createString(this.networkId) : 0);
        return DeleteOp.createDeleteOp(builder, networkId);
    };
    return DeleteOpT;
}());
exports.DeleteOpT = DeleteOpT;

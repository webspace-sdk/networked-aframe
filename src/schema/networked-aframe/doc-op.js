"use strict";
// automatically generated by the FlatBuffers compiler, do not modify
exports.__esModule = true;
exports.DocOpT = exports.DocOp = void 0;
var flatbuffers = require("flatbuffers");
var DocOp = /** @class */ (function () {
    function DocOp() {
        this.bb = null;
        this.bb_pos = 0;
    }
    DocOp.prototype.__init = function (i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    };
    DocOp.getRootAsDocOp = function (bb, obj) {
        return (obj || new DocOp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    };
    DocOp.getSizePrefixedRootAsDocOp = function (bb, obj) {
        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
        return (obj || new DocOp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    };
    DocOp.prototype.update = function (index) {
        var offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
    };
    DocOp.prototype.updateLength = function () {
        var offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    };
    DocOp.prototype.updateArray = function () {
        var offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? new Uint8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    };
    DocOp.startDocOp = function (builder) {
        builder.startObject(1);
    };
    DocOp.addUpdate = function (builder, updateOffset) {
        builder.addFieldOffset(0, updateOffset, 0);
    };
    DocOp.createUpdateVector = function (builder, data) {
        builder.startVector(1, data.length, 1);
        for (var i = data.length - 1; i >= 0; i--) {
            builder.addInt8(data[i]);
        }
        return builder.endVector();
    };
    DocOp.startUpdateVector = function (builder, numElems) {
        builder.startVector(1, numElems, 1);
    };
    DocOp.endDocOp = function (builder) {
        var offset = builder.endObject();
        builder.requiredField(offset, 4); // update
        return offset;
    };
    DocOp.createDocOp = function (builder, updateOffset) {
        DocOp.startDocOp(builder);
        DocOp.addUpdate(builder, updateOffset);
        return DocOp.endDocOp(builder);
    };
    DocOp.prototype.unpack = function () {
        return new DocOpT(this.bb.createScalarList(this.update.bind(this), this.updateLength()));
    };
    DocOp.prototype.unpackTo = function (_o) {
        _o.update = this.bb.createScalarList(this.update.bind(this), this.updateLength());
    };
    return DocOp;
}());
exports.DocOp = DocOp;
var DocOpT = /** @class */ (function () {
    function DocOpT(update) {
        if (update === void 0) { update = []; }
        this.update = update;
    }
    DocOpT.prototype.pack = function (builder) {
        var update = DocOp.createUpdateVector(builder, this.update);
        return DocOp.createDocOp(builder, update);
    };
    return DocOpT;
}());
exports.DocOpT = DocOpT;

"use strict";
// automatically generated by the FlatBuffers compiler, do not modify
exports.__esModule = true;
exports.UpdateOpT = exports.UpdateOp = void 0;
var flatbuffers = require("flatbuffers");
var full_update_data_1 = require("../networked-aframe/full-update-data");
var UpdateOp = /** @class */ (function () {
    function UpdateOp() {
        this.bb = null;
        this.bb_pos = 0;
    }
    UpdateOp.prototype.__init = function (i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    };
    UpdateOp.getRootAsUpdateOp = function (bb, obj) {
        return (obj || new UpdateOp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    };
    UpdateOp.getSizePrefixedRootAsUpdateOp = function (bb, obj) {
        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
        return (obj || new UpdateOp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    };
    UpdateOp.prototype.networkId = function (optionalEncoding) {
        var offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    };
    UpdateOp.prototype.fullUpdateData = function (obj) {
        var offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? (obj || new full_update_data_1.FullUpdateData()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    };
    UpdateOp.prototype.owner = function (index) {
        var offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
    };
    UpdateOp.prototype.ownerLength = function () {
        var offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    };
    UpdateOp.prototype.ownerArray = function () {
        var offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? new Uint8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    };
    UpdateOp.prototype.lastOwnerTime = function () {
        var offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.readUint64(this.bb_pos + offset) : this.bb.createLong(0, 0);
    };
    UpdateOp.prototype.components = function (index) {
        var offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
    };
    UpdateOp.prototype.componentsLength = function () {
        var offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    };
    UpdateOp.prototype.componentsArray = function () {
        var offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? new Uint8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    };
    UpdateOp.startUpdateOp = function (builder) {
        builder.startObject(5);
    };
    UpdateOp.addNetworkId = function (builder, networkIdOffset) {
        builder.addFieldOffset(0, networkIdOffset, 0);
    };
    UpdateOp.addFullUpdateData = function (builder, fullUpdateDataOffset) {
        builder.addFieldOffset(1, fullUpdateDataOffset, 0);
    };
    UpdateOp.addOwner = function (builder, ownerOffset) {
        builder.addFieldOffset(2, ownerOffset, 0);
    };
    UpdateOp.createOwnerVector = function (builder, data) {
        builder.startVector(1, data.length, 1);
        for (var i = data.length - 1; i >= 0; i--) {
            builder.addInt8(data[i]);
        }
        return builder.endVector();
    };
    UpdateOp.startOwnerVector = function (builder, numElems) {
        builder.startVector(1, numElems, 1);
    };
    UpdateOp.addLastOwnerTime = function (builder, lastOwnerTime) {
        builder.addFieldInt64(3, lastOwnerTime, builder.createLong(0, 0));
    };
    UpdateOp.addComponents = function (builder, componentsOffset) {
        builder.addFieldOffset(4, componentsOffset, 0);
    };
    UpdateOp.createComponentsVector = function (builder, data) {
        builder.startVector(1, data.length, 1);
        for (var i = data.length - 1; i >= 0; i--) {
            builder.addInt8(data[i]);
        }
        return builder.endVector();
    };
    UpdateOp.startComponentsVector = function (builder, numElems) {
        builder.startVector(1, numElems, 1);
    };
    UpdateOp.endUpdateOp = function (builder) {
        var offset = builder.endObject();
        builder.requiredField(offset, 4); // network_id
        builder.requiredField(offset, 12); // components
        return offset;
    };
    UpdateOp.prototype.unpack = function () {
        return new UpdateOpT(this.networkId(), (this.fullUpdateData() !== null ? this.fullUpdateData().unpack() : null), this.bb.createScalarList(this.owner.bind(this), this.ownerLength()), this.lastOwnerTime(), this.bb.createScalarList(this.components.bind(this), this.componentsLength()));
    };
    UpdateOp.prototype.unpackTo = function (_o) {
        _o.networkId = this.networkId();
        _o.fullUpdateData = (this.fullUpdateData() !== null ? this.fullUpdateData().unpack() : null);
        _o.owner = this.bb.createScalarList(this.owner.bind(this), this.ownerLength());
        _o.lastOwnerTime = this.lastOwnerTime();
        _o.components = this.bb.createScalarList(this.components.bind(this), this.componentsLength());
    };
    return UpdateOp;
}());
exports.UpdateOp = UpdateOp;
var UpdateOpT = /** @class */ (function () {
    function UpdateOpT(networkId, fullUpdateData, owner, lastOwnerTime, components) {
        if (networkId === void 0) { networkId = null; }
        if (fullUpdateData === void 0) { fullUpdateData = null; }
        if (owner === void 0) { owner = []; }
        if (lastOwnerTime === void 0) { lastOwnerTime = flatbuffers.createLong(0, 0); }
        if (components === void 0) { components = []; }
        this.networkId = networkId;
        this.fullUpdateData = fullUpdateData;
        this.owner = owner;
        this.lastOwnerTime = lastOwnerTime;
        this.components = components;
    }
    UpdateOpT.prototype.pack = function (builder) {
        var networkId = (this.networkId !== null ? builder.createString(this.networkId) : 0);
        var fullUpdateData = (this.fullUpdateData !== null ? this.fullUpdateData.pack(builder) : 0);
        var owner = UpdateOp.createOwnerVector(builder, this.owner);
        var components = UpdateOp.createComponentsVector(builder, this.components);
        UpdateOp.startUpdateOp(builder);
        UpdateOp.addNetworkId(builder, networkId);
        UpdateOp.addFullUpdateData(builder, fullUpdateData);
        UpdateOp.addOwner(builder, owner);
        UpdateOp.addLastOwnerTime(builder, this.lastOwnerTime);
        UpdateOp.addComponents(builder, components);
        return UpdateOp.endUpdateOp(builder);
    };
    return UpdateOpT;
}());
exports.UpdateOpT = UpdateOpT;

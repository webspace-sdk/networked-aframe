"use strict";
// automatically generated by the FlatBuffers compiler, do not modify
exports.__esModule = true;
exports.SceneUpdateT = exports.SceneUpdate = void 0;
var flatbuffers = require("flatbuffers");
var delete_op_1 = require("../networked-aframe/delete-op");
var update_op_1 = require("../networked-aframe/update-op");
var SceneUpdate = /** @class */ (function () {
    function SceneUpdate() {
        this.bb = null;
        this.bb_pos = 0;
    }
    SceneUpdate.prototype.__init = function (i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    };
    SceneUpdate.getRootAsSceneUpdate = function (bb, obj) {
        return (obj || new SceneUpdate()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    };
    SceneUpdate.getSizePrefixedRootAsSceneUpdate = function (bb, obj) {
        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
        return (obj || new SceneUpdate()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    };
    SceneUpdate.prototype.updates = function (index, obj) {
        var offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? (obj || new update_op_1.UpdateOp()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    };
    SceneUpdate.prototype.updatesLength = function () {
        var offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    };
    SceneUpdate.prototype.deletes = function (index, obj) {
        var offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? (obj || new delete_op_1.DeleteOp()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    };
    SceneUpdate.prototype.deletesLength = function () {
        var offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    };
    SceneUpdate.startSceneUpdate = function (builder) {
        builder.startObject(2);
    };
    SceneUpdate.addUpdates = function (builder, updatesOffset) {
        builder.addFieldOffset(0, updatesOffset, 0);
    };
    SceneUpdate.createUpdatesVector = function (builder, data) {
        builder.startVector(4, data.length, 4);
        for (var i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    };
    SceneUpdate.startUpdatesVector = function (builder, numElems) {
        builder.startVector(4, numElems, 4);
    };
    SceneUpdate.addDeletes = function (builder, deletesOffset) {
        builder.addFieldOffset(1, deletesOffset, 0);
    };
    SceneUpdate.createDeletesVector = function (builder, data) {
        builder.startVector(4, data.length, 4);
        for (var i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    };
    SceneUpdate.startDeletesVector = function (builder, numElems) {
        builder.startVector(4, numElems, 4);
    };
    SceneUpdate.endSceneUpdate = function (builder) {
        var offset = builder.endObject();
        return offset;
    };
    SceneUpdate.createSceneUpdate = function (builder, updatesOffset, deletesOffset) {
        SceneUpdate.startSceneUpdate(builder);
        SceneUpdate.addUpdates(builder, updatesOffset);
        SceneUpdate.addDeletes(builder, deletesOffset);
        return SceneUpdate.endSceneUpdate(builder);
    };
    SceneUpdate.prototype.unpack = function () {
        return new SceneUpdateT(this.bb.createObjList(this.updates.bind(this), this.updatesLength()), this.bb.createObjList(this.deletes.bind(this), this.deletesLength()));
    };
    SceneUpdate.prototype.unpackTo = function (_o) {
        _o.updates = this.bb.createObjList(this.updates.bind(this), this.updatesLength());
        _o.deletes = this.bb.createObjList(this.deletes.bind(this), this.deletesLength());
    };
    return SceneUpdate;
}());
exports.SceneUpdate = SceneUpdate;
var SceneUpdateT = /** @class */ (function () {
    function SceneUpdateT(updates, deletes) {
        if (updates === void 0) { updates = []; }
        if (deletes === void 0) { deletes = []; }
        this.updates = updates;
        this.deletes = deletes;
    }
    SceneUpdateT.prototype.pack = function (builder) {
        var updates = SceneUpdate.createUpdatesVector(builder, builder.createObjectOffsetList(this.updates));
        var deletes = SceneUpdate.createDeletesVector(builder, builder.createObjectOffsetList(this.deletes));
        return SceneUpdate.createSceneUpdate(builder, updates, deletes);
    };
    return SceneUpdateT;
}());
exports.SceneUpdateT = SceneUpdateT;

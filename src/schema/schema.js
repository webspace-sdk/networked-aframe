"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
exports.__esModule = true;
exports.UpdateOp = exports.FullUpdateData = exports.DeleteOp = void 0;
var delete_op_1 = require("./networked-aframe/delete-op");
__createBinding(exports, delete_op_1, "DeleteOp");
var full_update_data_1 = require("./networked-aframe/full-update-data");
__createBinding(exports, full_update_data_1, "FullUpdateData");
var update_op_1 = require("./networked-aframe/update-op");
__createBinding(exports, update_op_1, "UpdateOp");

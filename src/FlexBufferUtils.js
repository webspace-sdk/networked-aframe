const flexbuffers = require('flatbuffers/js/flexbuffers');
const { fromByteWidth } = require('flatbuffers/js/flexbuffers/bit-width-util');
const { isNumber, isIndirectNumber, isAVector, fixedTypedVectorElementSize, isFixedTypedVector, isTypedVector, typedVectorElementType, packedType, fixedTypedVectorElementType }  = require('flatbuffers/js/flexbuffers/value-type-util');
const { indirect, keyForIndex, keyIndex, readFloat, readInt, readUInt, valueForIndexWithKey } = require('flatbuffers/js/flexbuffers/reference-util');
const { BitWidth } = require('flatbuffers/js/flexbuffers/bit-width');

const tmpRef = new flexbuffers.toReference(new ArrayBuffer(4));
const tmpRef2 = new flexbuffers.toReference(new ArrayBuffer(4));

const refReset = (ref, buffer) => {
  const len = buffer.byteLength;

  if (ref.dataView.buffer !== buffer) {
    ref.dataView = new DataView(buffer);
  }

  const byteWidth = ref.dataView.getUint8(len - 1);
  ref.packedType = ref.dataView.getUint8(len - 2);
  ref.parentWidth = fromByteWidth(byteWidth);
  ref.offset = len - byteWidth - 2;
  ref.byteWidth = 1 << (ref.packedType & 3)
  ref.valueType = ref.packedType >> 2
  ref._length = -1;
};

const refAdvanceToIndexGet = (ref, index) => {
  const length = ref.length();
  const _indirect = indirect(ref.dataView, ref.offset, ref.parentWidth);
  const elementOffset = _indirect + index * ref.byteWidth;
  let _packedType = ref.dataView.getUint8(_indirect + length * ref.byteWidth + index);
  if (isTypedVector(ref.valueType)) {
    const _valueType = typedVectorElementType(ref.valueType);
    _packedType = packedType(_valueType, BitWidth.WIDTH8);
  } else if (isFixedTypedVector(ref.valueType)) {
    const _valueType = fixedTypedVectorElementType(ref.valueType);
    _packedType = packedType(_valueType, BitWidth.WIDTH8);
  }
  ref.offset = elementOffset;
  ref.parentWidth = fromByteWidth(ref.byteWidth);
  ref.packedType = _packedType;
  ref.byteWidth = 1 << (ref.packedType & 3)
  ref.valueType = ref.packedType >> 2
  ref._length = -1;
};

const refCp = (ref1, ref2) => {
  ref2.dataView = ref1.dataView;
  ref2.packedType = ref1.packedType;
  ref2.parentWidth = ref1.parentWidth;
  ref2.offset = ref1.offset;
  ref2.byteWidth = ref1.byteWidth;
  ref2.valueType = ref1.valueType;
  ref2.length(); // Side effect to reduce length computes
  ref2._length = ref1._length;
};

const refGetBool = (ref, key) => {
  refCp(ref, tmpRef);
  refAdvanceToIndexGet(tmpRef, key);
  return tmpRef.boolValue();
}

const refGetInt = (ref, key) => {
  refCp(ref, tmpRef);
  refAdvanceToIndexGet(tmpRef, key);
  return Number(tmpRef.intValue());
}

const refGetNumeric = (ref, key) => {
  refCp(ref, tmpRef);
  refAdvanceToIndexGet(tmpRef, key);
  return Number(tmpRef.numericValue());
}

const refGetString = (ref, key) => {
  refCp(ref, tmpRef);
  refAdvanceToIndexGet(tmpRef, key);
  return tmpRef.stringValue();
}

const refGetToObject = (ref, key) => {
  refCp(ref, tmpRef);
  refAdvanceToIndexGet(tmpRef, key);
  return tmpRef.toObject();
}

const refGetUuidBytes = (ref, key, target = []) => {
  target.length = 16;
  refCp(ref, tmpRef2);
  refAdvanceToIndexGet(tmpRef2, key);

  for (let i = 0; i < 16; i++) {
    target[i] = Number(refGetInt(tmpRef2, i));
  }

  return target;
}

module.exports = { refReset, refAdvanceToIndexGet, refGetBool, refGetInt, refGetNumeric, refGetString, refGetUuidBytes, refCp, refGetToObject }

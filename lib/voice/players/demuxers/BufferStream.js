"use strict";

class BufferStream {
  constructor(buffer) {
    this._buffer = buffer;
    this._offset = 0;
  }
  get ended() { return this._offset >= this._buffer.length; }
  get available() { return this._buffer.length - this._offset; }
  skip(bytes) { this.read(bytes); }
  read(bytes) {
    if (bytes <= 0) return null;
    if (this.ended) return null;
    if (this._offset + bytes > this._buffer.length) return null;
    var offset = this._offset;
    this._offset += bytes;
    return this._buffer.slice(offset, offset + bytes);
  }
  readByte() { return (this.read(1) || [null])[0]; }
  readString(size) {
    var v = this.read(size);
    return v ? v.toString("utf8", 0) : null;
  }
  readInt32LE() {
    var v = this.read(4);
    return v ? v.readInt32LE(0) : null;
  }
  readUInt32LE() {
    var v = this.read(4);
    return v ? v.readUInt32LE(0) : null;
  }
  readInt16LE() {
    var v = this.read(2);
    return v ? v.readInt16LE(0) : null;
  }
  readUInt16LE() {
    var v = this.read(2);
    return v ? v.readUInt16LE(0) : null;
  }
  readUInt8() {
    var v = this.read(1);
    return v ? v.readUInt8(0) : null;
  }
}

module.exports = BufferStream;
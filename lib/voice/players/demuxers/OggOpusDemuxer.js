"use strict";

const OGG_PAGE_HEADER_SIZE = 26;

const BufferStream = require("./BufferStream");

const Transform = require("stream").Transform;
class OggOpusDemuxer extends Transform {
  constructor() {
    super({
      writableObjectMode: true,
      readableObjectMode: true
    });
  }
  readSegments(reader) {
    var tableSize = reader.readByte();
    if (reader.available < tableSize) return null;

    var segmentSizes = [];
    for (var i = 0; i < tableSize; ) {
      var read = reader.readByte(); i++;
      var size = read;
      while (read === 255) {
        read = reader.readByte(); i++;
        size += read;
      }
      segmentSizes.push(size);
    }

    var dataSize = segmentSizes.reduce((c, n) => c + n, 0);
    if (reader.available < dataSize) return null;

    return segmentSizes.map(size => reader.read(size));
  }
  readPage(reader, done) {
    if (reader.available < OGG_PAGE_HEADER_SIZE) return false;
    var magic = reader.readString(4);
    if (magic !== "OggS")
      return new Error("OGG magic does not match");

    var version = reader.readByte();
    var headerType = reader.readByte();

    var isContinuation = headerType & (1 << 0);
    if (isContinuation)
      return new Error("OGG page continuation handling not implemented");

    var isBeginning = headerType & (1 << 1);
    var isEnd = headerType & (1 << 2);

    reader.skip(8); // granule position
    reader.skip(4); // stream serial number
    var pageSeq = reader.readInt32LE();
    reader.skip(4); // checksum

    var segments = this.readSegments(reader);
    if (segments == null) return false;
    if (segments.indexOf(null) >= 0) return false;

    var packets = [];
    for (var segment of segments) {
      var header = segment.toString("utf8", 0, 8);

      if (header === "OpusHead") {
        this._opusHeader = segment;
        this.emit("OpusHead", this._opusHeader);
      } else if (header === "OpusTags") {
        this._opusTags = segment;
        this.emit("OpusTags", this._opusTags);
      } else packets.push(segment);
    }

    if (!this._opusHeader) return true;
    packets.forEach(packet => this.push(packet));
    return true;
  }
  _transform(chunk, encoding, done) {
    if (this._leftover) {
      chunk = Buffer.concat([this._leftover, chunk]);
      this._leftover = null;
    }

    var reader = new BufferStream(chunk);

    while (!reader.ended) {
      // save current position if page reading fails
      var offset = reader._offset;
      var ok = this.readPage(reader, done);
      if (ok instanceof Error) return done(ok, null);
      if (!ok) {
        // save remaining buffer
        this._leftover = chunk.slice(offset, chunk.length);
        break;
      }
    }

    done();
  }
}

module.exports = OggOpusDemuxer;
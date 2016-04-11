"use strict";

const BufferStream = require("./BufferStream");

const Transform = require("stream").Transform;

const TRACKTYPE_VIDEO = 1;
const TRACKTYPE_AUDIO = 2;
const TRACKTYPE_COMPLEX = 3;

class WebmOpusDemuxer extends Transform {
  constructor() {
    super({
      writableObjectMode: true,
      readableObjectMode: true,
    });
    this.demuxingAudio = false;
    this.tracks = new Map();
  }
  _parseTracks(type, info, done) {
    if (info.name == "TrackEntry") {
      if (type == "start") {
        this.parsingTrack = {};
      }
      if (type == "end") {
        if (this.parsingTrack.hasOwnProperty("TrackNumber")) {
          const id = this.parsingTrack.TrackNumber;
          this.tracks.set(id, this.parsingTrack);
        }
        delete this.parsingTrack;
      }
    }

    if (this.parsingTrack && info.name == "TrackNumber")
      this.parsingTrack.TrackNumber = info.data[0];
    if (this.parsingTrack && info.name == "CodecID")
      this.parsingTrack.CodecID = info.data.toString();
    if (this.parsingTrack && info.name == "TrackType")
      this.parsingTrack.TrackType = info.data[0];

    if (type == "end" && info.name == "Tracks") {
      for (var track of this.tracks.values()) {
        if (track.TrackType != TRACKTYPE_AUDIO) continue;
        this.firstAudioTrack = track;
      }
      if (!this.firstAudioTrack) {
        return done(new Error("No audio track"), null);
      }
    }
  }
  _parseCodecPrivate(type, info, done) {
    const bin = info.data;
    if (type != "tag" || info.name != "CodecPrivate") return;

    const reader = new BufferStream(bin);

    var head = reader.readString(8);
    if (head != "OpusHead") {
      return done(new Error("Invalid codec " + head), null);
    }

    this.codecdata = {
      version: reader.readUInt8(),
      channelCount: reader.readUInt8(),
      preSkip: reader.readUInt16LE(),
      inputSampleRate: reader.readUInt32LE(),
      outputGain: reader.readUInt16LE(),
      mappingFamily: reader.readUInt8()
    };

    this.channels = this.codecdata.channelCount;
    this.sampleRate = this.codecdata.inputSampleRate;
    this.emit("format", {
      channels: this.channels,
      sampleRate: this.sampleRate
    });
  }
  _transform(chunk, encoding, done) {
    const type = chunk[0];
    const info = chunk[1];
    const bin = info.data;

    this._parseTracks(type, info, done);
    this._parseCodecPrivate(type, info, done);

    if (type == "tag" && info.name == "SimpleBlock") {
      const tracknumber = bin.readUInt8(0) & 0xF;
      if (tracknumber == this.firstAudioTrack.TrackNumber) {
        const timestamp = bin.readUInt16BE(1);
        const flags = bin.readUInt8(3);
        const data = bin.slice(4);

        this.push(data);

        if (!this.demuxingAudio) {
          this.emit("demux");
          this.demuxingAudio = true;
        }
      }
    }

    done();
  }
}
module.exports = WebmOpusDemuxer;
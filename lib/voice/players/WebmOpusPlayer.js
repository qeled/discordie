"use strict";

const ExternalEncoderBase = require("./ExternalEncoderBase");

const ebml = require('ebml');
ebml.Decoder.prototype.__transform = ebml.Decoder.prototype._transform;
ebml.Decoder.prototype._transform = function(chunk, encoding, done) {
  // catch "Unrepresentable length" errors
  try {
    this.__transform.apply(this, arguments);
  } catch (e) {
    this.push(null);
    done();
  }
};

const WebmOpusDemuxer = require("./demuxers/WebmOpusDemuxer");

/**
 * @class
 * @extends ExternalEncoderBase
 * @classdesc
 * Simple wrapper for webm opus streams.
 *
 * ```js
 * var info = client.VoiceConnections[0];
 * if (!info) return console.log("Voice not connected");
 *
 * var source = fs.createReadStream("test.webm");
 * var encoder = info.voiceConnection.createExternalEncoder({
 *   type: "WebmOpusPlayer",
 *   source: source
 * });
 * if (!encoder) return console.log("Voice connection is disposed");
 *
 * encoder.once("end", () => console.log("stream end"));
 * encoder.once("unpipe", () => source.destroy()); // close file descriptor
 *
 * var encoderStream = encoder.play();
 * encoderStream.resetTimestamp();
 * encoderStream.removeAllListeners("timestamp");
 * encoderStream.on("timestamp", time => console.log("Time " + time));
 * ```
 *
 * #### Events:
 *
 * - ** Event: `end` **
 *
 *   Emitted when stream ends.
 *
 * - ** Event: `unpipe` **
 *
 *   Emitted when stream gets unpiped from `AudioEncoderStream`.
 *   If you create file streams make sure descriptors get destroyed here.
 *
 * - ** Event: `error` **
 *
 *   Emitted if an error occurred while demuxing. The stream will unpipe
 *   itself on this event.
 */
class WebmOpusPlayer extends ExternalEncoderBase {
  constructor(voiceConnection, options) {
    super(voiceConnection, options);

    if (!options.source || typeof options.source.pipe !== "function") {
      throw new TypeError(`Invalid source '${options.source}'`);
    }

    this._ebmld = new ebml.Decoder();
    this._stream = new WebmOpusDemuxer();
    options.source.pipe(this._ebmld).pipe(this._stream);

    this._stream.on("error", err => {
      this.emit("error", err);
      this.unpipe();
    });
    this._stream.on("end", () => {
      if (!this._stream._readableState.pipesCount) return;
      // don't emit 'end' after 'unpipe'
      this.emit("end");
    });
  }
  pipe(dest) {
    this._stream.pipe(dest);
  }
  unpipe(dest) {
    this._stream.unpipe(dest);
  }
}

module.exports = WebmOpusPlayer;
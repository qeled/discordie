"use strict";

const ExternalEncoderBase = require("./ExternalEncoderBase");
const OggOpusDemuxer = require("./demuxers/OggOpusDemuxer");

/**
 * @class
 * @extends ExternalEncoderBase
 * @classdesc
 * Simple wrapper for ogg opus streams. Streams audio on the fly without
 * decoding.
 *
 * ```js
 * var info = client.VoiceConnections[0];
 * if (!info) return console.log("Voice not connected");
 *
 * var source = fs.createReadStream("test.opus");
 * var encoder = info.voiceConnection.createExternalEncoder({
 *   type: "OggOpusPlayer",
 *   source: source
 * });
 * if (!encoder) return console.log("Voice connection is disposed");
 *
 * encoder.once("end", () => console.log("stream end"));
 * encoder.once("error", err => console.log("Ogg Error", err));
 *
 * var encoderStream = encoder.play();
 * encoderStream.once("unpipe", () => source.destroy()); // close descriptor
 *
 * encoderStream.resetTimestamp();
 * encoderStream.removeAllListeners("timestamp");
 * encoderStream.on("timestamp", time => console.log("Time " + time));
 * ```
 *
 * #### Events:
 *
 * - ** Event: `end` **
 *
 *   Emitted when stream done playing.
 *
 * - ** Event: `unpipe` **
 *
 *   Emitted when stream gets unpiped from `AudioEncoderStream`.
 *   Proxies `AudioEncoderStream` unpipe event, fires only when
 *   using `play()` method.
 *   If you create file or http streams make sure descriptors get destroyed on
 *   unpiping.
 *
 * - ** Event: `error` **
 *
 *   Emitted if an error occurred while demuxing. The stream will unpipe
 *   itself on this event.
 */
class OggOpusPlayer extends ExternalEncoderBase {
  constructor(voiceConnection, options) {
    super(voiceConnection, options);

    if (!options.source || typeof options.source.pipe !== "function") {
      throw new TypeError(`Invalid source '${options.source}'`);
    }

    this._stream = new OggOpusDemuxer();
    this._stream.on("error", err => {
      this.emit("error", err);
      this.unpipe();
    });
    this._stream.on("end", () => {
      if (!this._stream._readableState.pipesCount) return;
      // don't emit 'end' after 'unpipe'
      this.emit("end");
    });

    options.source.pipe(this._stream);
  }
  pipe(dest) {
    this._stream.pipe(dest);
  }
  unpipe(dest) {
    this._stream.unpipe(dest);
  }
}

module.exports = OggOpusPlayer;
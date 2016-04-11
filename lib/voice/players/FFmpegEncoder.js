"use strict";

const ExternalEncoderBase = require("./ExternalEncoderBase");
const OggOpusDemuxer = require("./demuxers/OggOpusDemuxer");

/**
 * @class
 * @extends ExternalEncoderBase
 * @classdesc
 * Simple FFmpeg wrapper that binds to a voice connection,
 * encodes audio into opus
 * (by default encodes using external process, not inside node.js).
 *
 * Requires `ffmpeg` or `avconv` installed and in PATH or current directory.
 *
 * ```js
 * var info = client.VoiceConnections[0];
 * if (!info) return console.log("Voice not connected");
 *
 * var encoder = info.voiceConnection.createExternalEncoder({
 *   type: "ffmpeg",
 *
 *   // any source ffmpeg can read (ffmpeg option '-i');
 *   // (with "-" source pipe data into `encoder.stdin`)
 *   source: "test.mp3",
 *
 *   // "opus" or "pcm", in "opus" mode AudioEncoder.setVolume won't work
 *   // - "opus" - encode audio using ffmpeg only and let node just stream opus
 *   // - "pcm" - request pcm data from ffmpeg and encode inside node.js
 *   format: "opus", // < default
 *
 *   // "pcm" mode option
 *   frameDuration: 60, // < default
 *
 *   // optional array of additional arguments (applied to input stream)
 *   inputArgs: [],
 *
 *   // optional array of additional arguments (applied to output stream)
 *   // (this volume parameter is passed into ffmpeg and applied for both
 *   //  "pcm" and "opus" formats, but can't be changed dynamically)
 *   outputArgs: ["-af", "volume=0.05"],
 *
 *   // optional, 'true' redirects ffmpeg's stderr into console
 *   //                  and starts with "-loglevel warning"
 *   debug: false
 * });
 * if (!encoder) return console.log("Voice connection is disposed");
 *
 * encoder.once("end", () => console.log("stream end"));
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
 */
class FFmpegEncoder extends ExternalEncoderBase {
  constructor(voiceConnection, options) {
    super(voiceConnection, options);

    this._format = options.format || "opus";
    this._frameDuration = options.frameDuration || 60;
    this._debug = options.debug || false;

    const args = this._getArgs(options);
    const handle =
      this._createProcess("ffmpeg", args) ||
      this._createProcess("avconv", args);

    if (!handle) {
      throw new Error(
        "Unable to spawn 'ffmpeg' or 'avconv', neither of them seems " +
        "to be in PATH or current folder"
      );
    }

    handle.stdin.on("error", err => {
      if (err.code === "EOF" || err.code == "EPIPE") return;
      console.error("FFmpegEncoder stdin: " + err);
      throw err;
    });

    if (this._format === "pcm") {
      this._stream = handle.stdout;
    } else {
      this._stream = new OggOpusDemuxer();
      handle.stdout.pipe(this._stream);
    }

    this._stream.on("end", () => {
      if (!this._stream._readableState.pipesCount) return;
      // don't emit 'end' after 'unpipe'
      this.emit("end");
    });

    if (this._debug) handle.stderr.pipe(process.stdout);

    this._setHandle(handle);
  }
  _getArgs(options) {
    if (!options.source) {
      console.warn(
        "Warning: options.source is not defined, using stdin as input"
      );
    }

    const source = options.source || "-";
    const inputArgs = options.inputArgs || [];
    const outputArgs = options.outputArgs || [];

    const args = [
      options.realtime ? "-re" : null,
      "-analyzeduration", "0",
      "-loglevel", this._debug ? "warning" : "0",
      "-i", source
    ];

    const pcmArgs = [
      "-f", "s16le", "-ar", 48000, "-ac", 2, "-"
    ];
    const opusArgs = [
      "-c:a", "libopus", "-frame_duration", "60", "-f", "ogg", "-"
    ];

    const formatArgs = this._format === "pcm" ? pcmArgs : opusArgs;

    return inputArgs
      .concat(args)
      .concat(outputArgs)
      .concat(formatArgs)
      .filter(v => v);
  }

  /**
   * Gets stdin.
   *
   * @returns {WritableStream|null}
   * @readonly
   */
  get stdin() { return (this._handle && this._handle.stdin) || null; }

  play() {
    const pcmOptions = {
      proxy: false,
      sampleRate: 48000,
      channels: 2,
      frameDuration: this._frameDuration
    };
    const options = this._format === "pcm" ? pcmOptions : {proxy: true};
    return super.play(options);
  }
  pipe(dest) {
    this._stream.pipe(dest);
  }
  unpipe(dest) {
    this._stream.unpipe(dest);
  }
}

module.exports = FFmpegEncoder;
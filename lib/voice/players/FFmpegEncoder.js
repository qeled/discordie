"use strict";

const ExternalEncoderBase = require("./ExternalEncoderBase");

const EBMLDecoder = require("./demuxers/EBMLDecoder");
const WebmOpusDemuxer = require("./demuxers/WebmOpusDemuxer");

function stderrDataListener(data) {
  process.stdout.write("[FFmpeg] " + data);
}

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
 * > Please note that FFmpeg **must be compiled with `libopus` support**
 * > and whatever other audio codecs you intend to use.
 *
 * ```js
 * var info = client.VoiceConnections[0];
 * if (!info) return console.log("Voice not connected");
 *
 * var encoder = info.voiceConnection.createExternalEncoder({
 *   type: "ffmpeg",
 *
 *   // any source FFmpeg can read (http, rtmp, etc.) (FFmpeg option '-i');
 *   // (with "-" source pipe data into `encoder.stdin`)
 *   source: "test.mp3",
 *
 *   // "opus" or "pcm", in "opus" mode AudioEncoder.setVolume won't work
 *   // - "opus" - encode audio using FFmpeg only and let node just stream opus
 *   // - "pcm" - request pcm data from FFmpeg and encode inside node.js
 *   format: "opus", // < default
 *
 *   // "pcm" mode option
 *   frameDuration: 60, // < default
 *
 *   // optional array of additional arguments (applied to input stream)
 *   inputArgs: [],
 *
 *   // optional array of additional arguments (applied to output stream)
 *   // (this volume parameter is passed into FFmpeg and applied for both
 *   //  "pcm" and "opus" formats, but can't be changed dynamically)
 *   outputArgs: ["-af", "volume=0.05"],
 *
 *   // optional, 'true' redirects FFmpeg's stderr into console
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
 * > **Note:** Since so many users prefer the `ytdl-core` package over
 * > `youtube-dl` and use it incorrectly, this is probably the best way to
 * > work with it (filter formats from `getInfo` and pass url to FFmpeg):
 *
 * ```js
 * function playRemote(remote, info) {
 *   function onMediaInfo(err, mediaInfo) {
 *     if (err) return console.log("ytdl error:", err);
 *     // sort by bitrate, high to low; prefer webm over anything else
 *     var formats = mediaInfo.formats.filter(f => f.container === "webm")
 *     .sort((a, b) => b.audioBitrate - a.audioBitrate);
 *
 *     // get first audio-only format or fallback to non-dash video
 *     var bestaudio = formats.find(f => f.audioBitrate > 0 && !f.bitrate) ||
 *                     formats.find(f => f.audioBitrate > 0);
 *     if (!bestaudio) return console.log("[playRemote] No valid formats");
 *
 *     if (!info) info = client.VoiceConnections[0];
 *     if (!info) return console.log("[playRemote] Voice not connected");
 *     // note that in this case FFmpeg must also be compiled with HTTPS support
 *     var encoder = info.voiceConnection.createExternalEncoder({
 *       type: "ffmpeg", source: bestaudio.url
 *     });
 *     encoder.play();
 *   }
 *   try {
 *     ytdl.getInfo(remote, onMediaInfo);
 *   } catch (e) { console.log("ytdl threw:", e); }
 * }
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

    const stdin = handle.stdin;
    stdin.on("error", err => {
      if (err.code === "EOF" || err.code == "EPIPE") return;
      if (stdin.listenerCount("error") !== 1) return;
      // throw only if there are no other stdin error handlers
      console.error("FFmpegEncoder stdin: " + err);
      throw err;
    });

    if (this._format === "pcm") {
      this._stream = handle.stdout;
    } else {
      this._ebmld = new EBMLDecoder();
      this._stream = new WebmOpusDemuxer();
      handle.stdout.pipe(this._ebmld).pipe(this._stream);
    }

    this._stream.on("end", () => {
      if (!this._stream._readableState.pipesCount) return;
      // don't emit 'end' after 'unpipe'
      this.emit("end");
    });

    if (this._debug) handle.stderr.on("data", stderrDataListener);

    this._setHandle(handle, this._onExit.bind(this));
  }
  _onExit(code) {
    // nodejs bug since v5.11.0 (backported to 4.4.5+)
    // workaround for ffmpeg stdout not closing/ending if piped stream is slow
    if (this._handle && this._handle.stdout) {
      this._handle.stdout._readableState.awaitDrain = 0;
    }

    if (!code || code === 255 || code === 123) return;
    //   0 -> normal exit
    // 255 -> exit on interrupt
    // 123 -> hard exit
    if (!this._debug) return;
    console.error(
      this.constructor.name +
      ": external encoder exited with code " + code
    );
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
      "-i", source,
      "-vn"
    ];

    const pcmArgs = [
      "-f", "s16le", "-ar", 48000, "-ac", 2, "-"
    ];
    const opusArgs = [
      "-c:a", "libopus", "-frame_duration", "60", "-f", "webm", "-"
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
  destroy() {
    if (this._handle && this._handle.exitCode === null) {
      const handle = this._handle;
      // send an extra SIGTERM to interrupt transcoding
      handle.kill();
      // kill with SIGKILL if it still hasn't exited
      setTimeout(() => handle.kill("SIGKILL"), 5000);
    }
    super.destroy(); // send SIGTERM and dispose instance
  }
}

module.exports = FFmpegEncoder;
"use strict";

const fork = require("child_process").fork;
const EncoderWorker = require("./threading/EncoderWorker");
const AudioEncoderStream = require("./streams/AudioEncoderStream");
const Constants = require("../Constants");

var useBufferFrom = false;
try {
  Buffer.from([]);
  useBufferFrom = true;
} catch (e) { } //eslint-disable-line no-empty

const defaultOptions = {
  multiThreadedVoice: false,
};

/**
 * @class
 * @classdesc
 * Primary audio encoder class (low level).
 * All other encoders and streams abstract this class.
 */
class AudioEncoder {
  constructor(voicews, options) {
    this.options = {};

    this.voicews = voicews;

    /**
     * Override this function to be called when encoder needs data.
     *
     * > **Note:** This function **WILL NOT** be called if an
     * > `AudioEncoderStream` instance is piping data into the encoder on the
     * > same voice connection to avoid buffer interleaving.
     * @instance
     * @memberOf AudioEncoder
     * @name onNeedBuffer
     * @returns {Function|null}
     * @example
     * var bitDepth = 16;
     *
     * var options = {
     *   frameDuration: 60,
     *   sampleRate: 48000,
     *   channels: 2
     * };
     * var encoder = voiceConnection.getEncoder(options);
     *
     * var readSize =
     *   options.sampleRate / 1000 *
     *   options.frameDuration *
     *   bitDepth / 8 *
     *   channels;
     *
     * // [sampleRate]    48000 / 1000 *
     * // [frameDuration] 60 *
     * // [bitDepth]      16 / 8 *
     * // [channels]      2
     * //               = 11520 bytes
     *
     * encoder.onNeedBuffer = function() {
     *   var chunk = reader.read(readSize);
     *
     *   if (!chunk) return;
     *   // return will stop onNeedBuffer calls until you call .enqueue again
     *
     *   var sampleCount = options.sampleRate / 1000 * options.frameDuration;
     *
     *   // [sampleRate]    48000 / 1000 *
     *   // [frameDuration] 60
     *   //               = 2880 samples
     *
     *   encoder.enqueue(chunk, sampleCount);
     * };
     * encoder.onNeedBuffer();
     */
    this.onNeedBuffer = null;

    this._stream = new AudioEncoderStream(this);
    this.initialize(options);
  }
  get canStream() {
    return this.voicews && this.voicews.canStream;
  }

  /**
   * Checks worker state: returns true if not initialized.
   * @returns {boolean}
   */
  get disposed() {
    return this.worker == null;
  }

  /**
   * Initializes worker object.
   * @param {Object} options
   * @example
   * var options = {};
   *
   * // frame size in milliseconds, forced range from 20 to 60
   * // (frame sizes below 20ms are unsupported)
   * options.frameDuration = 60; // < default

   * // input sample rate,
   * // anything other than 48000 will be resampled by the library
   * // to match Discord output sample rate
   * options.sampleRate = 48000; // < default
   * options.sampleRate = 44100; // will be resampled to 48000

   * // number of channels, only mono (1) or stereo (2)
   * options.channels = 1; // < default

   * // read as 32-bit floating point audio
   * options.float = false;
   *
   * // downmix to mono audio
   * options.downmix = "average";
   * // encode multichannel audio
   * options.downmix = false; // < default
   *
   * // use emscripten-compiled opus codec
   * options.engine = "internal"; // < default
   * // try to use native `node-opus` module,
   * // must be installed in discordie/node_modules
   * options.engine = "native";
   *
   * // proxy mode, passes packets straight to the muxer
   * // packets should be opus encoded already
   * // in this mode it only works as scheduler for packets
   * options.proxy = false; // < default
   * options.proxy = true;
   *
   * // OPUS_AUTO          -1000
   * // OPUS_BITRATE_MAX   -1
   * options.bitrate = -1000; // < default
   * // encode 64kbps audio
   * options.bitrate = 64000;
   * // encode 128kbps audio - max bitrate for Discord servers, do not exceed
   * options.bitrate = 128000;
   *
   * encoder.initialize(options);
   */
  initialize(options) {
    if (!options) options = defaultOptions;

    const hasChanges = Object.keys(options).reduce((r, k) => {
      return r || (this.options[k] != options[k])
    }, false);
    if (hasChanges) this.kill();

    const _defaultOptions = Object.assign({}, defaultOptions);
    this.options = Object.assign(_defaultOptions, options);

    if (this.disposed) {
      if (options.multiThreadedVoice) {
        this.worker = fork(__dirname + "/threading/EncoderWorker");
      } else {
        this.worker = new EncoderWorker();
      }

      this.worker.on("message", (msg) => {
        switch (msg.op) {
        case "needbuffer":
          var streamMode = false;
          if (this._stream && this._stream._needBuffer()) {
            streamMode = true;
          }
          if (!streamMode && typeof this.onNeedBuffer === "function")
            this.onNeedBuffer();
          break;
        case "opuspacket":
          if (this.voicews.connected && !this.voicews.audioTransportSocket)
            throw new Error("No transport");

          if (!this.voicews.connected) break;
          if (!msg.packet) break;

          let packetData = msg.packet.data;
          if (msg.packet instanceof Buffer)
            packetData = msg.packet;
          if (Array.isArray(packetData)) { // received from separate process
            packetData =
              useBufferFrom ? Buffer.from(packetData) : new Buffer(packetData);
          }

          this.voicews.audioTransportSocket
            .send(packetData, msg.sampleCount);
          break;
        }
      });
    }

    this.worker.send({
      op: "initialize",
      options
    });

    if (this._stream) this._stream._needBuffer();

    this.onNeedBuffer = null;
  }

  /**
   * Sets volume.
   * Does not apply in proxy mode.
   * @param {Number} volume - Number range from 0 to 100
   */
  setVolume(volume) {
    if (this.disposed) return;
    this.worker.send({
      op: "set",
      key: "volume",
      value: volume
    });
  }

  /**
   * Sets bitrate.
   * Does not apply in proxy mode.
   * @param {Number} bitrate - Number range from 8000 to 512000
   */
  setBitrate(bitrate) {
    if (this.disposed) return;
    this.worker.send({
      op: "setBitrate",
      value: bitrate
    });
  }

  /**
   * Enqueues audio (PCM or Opus packet (proxy mode), depending on options)
   * to the queue buffer.
   * @param {Buffer} chunk
   * @param {Number} sampleCount - Number of samples per channel
   */
  enqueue(chunk, sampleCount) {
    if (this.disposed) return;
    this.worker.send({
      op: "enqueue",
      frame: {
        chunk: chunk,
        sampleCount: sampleCount
      }
    });
  }

  /**
   * Enqueues an array of audio chunks (PCM or Opus packet (proxy mode),
   * depending on options) to the queue buffer.
   *
   * All chunks should have the same `sampleCount`.
   * @param {Array<Buffer>} chunks
   * @param {Number} sampleCount - Number of samples per channel
   */
  enqueueMultiple(chunks, sampleCount) {
    if (this.disposed) return;
    this.worker.send({
      op: "enqueueMultiple",
      frames: chunks.map(chunk => { return {chunk, sampleCount}; })
    });
  }

  /**
   * Clears audio queue.
   */
  clearQueue() {
    if (this.disposed) return;
    this.worker.send({ op: "clearQueue" });
  }

  /**
   * Shuts down the worker.
   */
  kill() {
    if (this.disposed) return;
    if (this._stream) this._stream.unpipeAll();
    this.worker.kill();
    this.worker = null;
  }
}

module.exports = AudioEncoder;

"use strict";

const Constants = require("../../Constants");
const Utils = require("../../core/Utils");
const Writable = require("stream").Writable;
const OpusUtils = require("./OpusUtils");

/**
 * @class
 * @classdesc
 * This is a regular `Writable` stream that abstracts `AudioEncoder`.
 *
 * Only one stream can be piped at a time, previous stream will automatically
 * unpipe if you connect a new one.
 *
 * Stream instance is bound to a voice connection and persists until the
 * connection is disposed.
 *
 * You also can `cork()` and `uncork()` it to pause or unpause like any other
 * writable stream.
 *
 * ```js
 * var lame = require("lame");
 * var mp3decoder = new lame.Decoder();
 * var file = fs.createReadStream("test.mp3");
 * file.pipe(mp3decoder);
 *
 * mp3decoder.on('format', pcmfmt => {
 *   var options = {
 *     sampleRate: pcmfmt.sampleRate,
 *     channels: pcmfmt.channels,
 *   };
 *
 *   var info = client.VoiceConnections[0];
 *   if (!info) return console.log("Voice not connected");
 *
 *   var encoderStream = info.voiceConnection.getEncoderStream(options);
 *   if (!encoderStream) return console.log("Connection is disposed");
 *
 *   encoderStream.resetTimestamp();
 *   // you can register timestamp listener only once on VOICE_CONNECTED
 *   // instead of unregistering all listeners every time
 *   encoderStream.removeAllListeners("timestamp");
 *   encoderStream.on("timestamp", time => console.log("Time " + time));
 *
 *   mp3decoder.pipe(encoderStream);
 *   mp3decoder.once('end', () => console.log("stream end"));
 *
 *   // must be registered after `pipe()`
 *   encoderStream.once("unpipe", () => file.destroy()); // close descriptor
 * });
 * ```
 *
 * #### Events:
 *
 * - ** Event: `timestamp` **
 *
 *   Emits a `Number` value in seconds as argument when the `timestamp` is
 *   incremented.
 */
class AudioEncoderStream extends Writable {
  constructor(encoder) {
    super({ highWaterMark: 0 });
    // disable internal buffer for edge cases like proxy mode changes

    this.source = null;
    this.on("pipe", src => {
      this.unpipeAll();
      this.source = src;
    });
    this.on("unpipe", src => this.unpipeAll());

    this._done = null;
    this._encoder = encoder;

    this._buffer = null;

    /**
     * Current timestamp in seconds.
     *
     * Increments when a chunk is processed.
     * @type {Number}
     */
    this.timestamp = 0;

    Utils.privatify(this);
  }
  _needBuffer() {
    if (typeof this._done === "function") {
      var done = this._done;
      this._done = null;
      // callback can invoke _write and overwrite this._done
      done();
      return true;
    }
    return false;
  }
  _write(chunk, encoding, done) {
    // blackhole the stream if encoder is destroyed
    if (this._encoder.disposed) return done();

    if (this._encoder.options.proxy) {
      return this._writeOpus(chunk, done);
    }
    this._writePCM(chunk, done);
  }
  _writeOpus(chunk, done) {
    // input stream must produce single opus packet as chunk
    const numSamples =
      OpusUtils.packet_get_nb_samples(chunk, Constants.DISCORD_SAMPLE_RATE);

    if (numSamples < 0) return done(new Error("Invalid opus packet"));

    // reinitialize scheduler if frame duration does not match
    const frameDuration = numSamples / Constants.DISCORD_SAMPLE_RATE * 1000;
    const options = this._encoder.options;
    if (options.frameDuration != frameDuration) {
      options.frameDuration = frameDuration;
      this._encoder.initialize(options);
    }

    this._done = done;
    this._addTimestamp(numSamples / Constants.DISCORD_SAMPLE_RATE);
    this._encoder.enqueue(chunk, numSamples);
  }
  _writePCM(chunk, done) {
    if (this._buffer) {
      chunk = Buffer.concat([this._buffer, chunk]);
      this._buffer = null;
    }

    var options = this._encoder.options;
    if (!options.sampleRate)
      return done(new Error("Invalid sampleRate: " + options.sampleRate));
    if (!options.frameDuration)
      return done(new Error("Invalid frameDuration: " + options.frameDuration));

    var bitDepth = options.float ? 32 : 16;
    var numSamples =
      options.sampleRate / 1000 *
      options.frameDuration;
    var readSize =
      numSamples *
      bitDepth / 8 *
      (options.channels || 1);

    if (chunk.length < readSize) {
      // not enough data, save the chunk and request more
      if (chunk.length > 0)
        this._buffer = chunk;
      return done();
    }

    var framesAvailable = Math.floor(chunk.length / readSize);
    var frames = [];
    for (var i = 0; i < framesAvailable; i++) {
      var offset = i * readSize;
      frames.push(chunk.slice(offset, offset + readSize));
    }

    this._done = done;
    this._addTimestamp((framesAvailable * numSamples) / options.sampleRate);
    this._encoder.enqueueMultiple(frames, numSamples);

    var excessBytes = chunk.length - framesAvailable * readSize;
    if (excessBytes > 0) this._buffer = chunk.slice(-excessBytes);
  }
  _addTimestamp(value) {
    this.timestamp += value;
    this.emit("timestamp", this.timestamp);
  }
  end(chunk, encoding, done) {
    // not endable, just write the chunk

    if (typeof chunk === 'function') {
      done = chunk;
      chunk = null;
      encoding = null;
    } else if (typeof encoding === 'function') {
      done = encoding;
      encoding = null;
    }

    if (chunk !== null && chunk !== undefined) {
      this.write(chunk, encoding, done);
    }
  }

  /**
   * Resets current timestamp.
   */
  resetTimestamp() {
    this.timestamp = 0;
  }

  /**
   * Unpipes the connected stream if piped.
   */
  unpipeAll() {
    if (!this.source) return;
    this.source.unpipe(this);
    this.source = null;
    this._needBuffer();
  }
}

module.exports = AudioEncoderStream;
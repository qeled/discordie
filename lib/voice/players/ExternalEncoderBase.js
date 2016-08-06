"use strict";

const fs = require("fs");
const path = require("path");
const spawn = require("child_process").spawn;
const EventEmitter = require("events").EventEmitter;

const Utils = require("../../core/Utils");

const ENVPATH = ["."].concat((process.env.PATH || "").split(path.delimiter));

class ExternalEncoderBase extends EventEmitter {
  constructor(voiceConnection, options) {
    super();

    this._voiceConnection = voiceConnection;
    this._encoderStream = null;
    this._destroyOnUnpipe = options.destroyOnUnpipe !== false;

    this._handle = null;

    this._disposed = false;
  }
  _createProcess(executable, args, options) {
    var binaries = [executable, executable + ".exe"];

    for (var name of binaries) {
      for (var dir of ENVPATH) {
        var binary = dir + path.sep + name;
        if (!Utils.fileExists(binary)) continue;

        return spawn(name, args, options);
      }
    }
    return null;
  }
  _setHandle(handle, onExit) {
    this._handle = handle;
    this._handle.on("exit", code => {
      if (typeof onExit === "function") onExit(code);
      this.destroy();
    });
  }

  /**
   * Gets the voice connection this instance is bound to.
   * @returns {IVoiceConnection}
   * @readonly
   */
  get voiceConnection() { return this._voiceConnection; }

  /**
   * Connects pipe into AudioEncoderStream of the bound voice connection.
   *
   * This function handles automatic unpiping and kills process.
   * The stream will become disposed and no longer playable after
   * calling `unpipe()` or `stop()`.
   *
   * Use `pipe()` method if you want to control the process manually
   * and `destroy()` it later.
   * @returns {AudioEncoderStream}
   */
  play(encoderOptions) {
    if (this._disposed) throw new Error("Unable to play disposed stream");

    // already playing, ignore request
    if (this._encoderStream) return this._encoderStream;

    encoderOptions = encoderOptions || {proxy: true};

    const encoder = this._voiceConnection.getEncoderStream(encoderOptions);
    if (!encoder) return null;

    this.pipe(encoder);

    encoder.once("unpipe", () => {
      if (!this._destroyOnUnpipe) return;
      this.emit("unpipe");
      this.destroy();
      this._encoderStream = null;
    });

    this._encoderStream = encoder;

    return encoder;
  }

  /**
   * Unpipes internal stream from the bound voice connection.
   */
  stop() {
    this.unpipe(this._encoderStream);
  }

  /**
   * Pipes stream into destination.
   *
   * > **Note:** In case of manual piping you have to invoke
   * > `IVoiceConnection.getEncoderStream` with the correct settings yourself.
   * > For proxy (externally encoding) streams only `{proxy: true}` is required.
   * @param {WritableStream} dest
   */
  pipe(dest) { throw new Error("Not implemented"); }

  /**
   * Unpipes stream from destination.
   * @param {WritableStream} [dest]
   */
  unpipe(dest) { throw new Error("Not implemented"); }

  /**
   * Destroys all handles, releases resources and disposes this instance.
   */
  destroy() {
    this._disposed = true;
    if (!this._handle) return;
    this._handle.kill();
    this._handle = null;
  }
}

module.exports = ExternalEncoderBase;
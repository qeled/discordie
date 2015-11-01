"use strict";

const events = require("events");
const nopus = require("../../../deps/nopus");
const Utils = require("../../core/Utils");

class EncoderWorker extends events.EventEmitter {
  kill() {
    if (this.encoder) {
      this.encoder.destroy();
      this.encoder = null;
    }
    if (this.resampler) {
      this.resampler.destroy();
      this.resampler = null;
    }
    this.audioQueue.length = 0;
    this.audioQueue = null;
  }
}

const hrtime = function() {
  const t = process.hrtime();
  return t[0] * 1000 + t[1] / 1000000;
}

function initialize(_options) {
  if (this.encoder != null) {
    this.encoder.destroy();
  }
  if (this.resampler != null) {
    this.resampler.destroy();
    this.resampler = null;
  }

  _options.frameDuration = _options.frameDuration || 60;
  _options.frameDuration = Math.max(20, Math.min(_options.frameDuration, 60));
  _options.sampleRate = _options.sampleRate || 48000;
  _options.channels = _options.channels || 1;
  _options.float = _options.float || false;
  _options.downmix = _options.downmix;

  this.options = _options;

  const sampleRate = 48000;
  const channels = 1;
  this.encoder = new nopus.OpusEncoder(
    sampleRate,
    channels,
    nopus.OpusApplication.Audio,
    this.options.frameDuration
  );

  if (sampleRate != this.options.sampleRate) {
    this.resampler = new nopus.Resampler(1,
      this.options.sampleRate, sampleRate,
      this.options.float ? 32 : 16, this.options.float
    );
  }

  this.startTime = hrtime();
  this.lastFrame = 0;

  this.audioQueue = [];
}

function processQueue() {
  if (this.audioQueue.length <= 0) return;

  setImmediate(this.timerCallback.bind(this));
}

function timerCallback() {
  if (this.encoder == null)
    return;
    //throw new Error("Encoder is not initialized");

  if (this.audioQueue && this.audioQueue.length <= 0) {
    this.sendNeedBuffer();
    return;
  }

  const frameDuration = this.options.frameDuration;

  const nextFrame = Math.round((hrtime() - this.startTime) / frameDuration);

  const hiresTimerThreshold = this.options.frameDuration / 4;
  if (nextFrame <= this.lastFrame) {
    const timeleft =
      frameDuration - (hrtime() - this.startTime - this.lastFrame * frameDuration);

    if (timeleft <= hiresTimerThreshold) {
      return setImmediate(this.timerCallback.bind(this));
    }
    return setTimeout(this.timerCallback.bind(this), timeleft / 4);
  }
  this.lastFrame++;

  this.processAudio();
  return setImmediate(this.timerCallback.bind(this));
}

function processAudio() {
  const frame = this.audioQueue.shift();

  let frameData = frame.chunk.data;
  if (frame.chunk instanceof Buffer)
    frameData = frame.chunk;

  if (!frame.chunk || !frameData || !frame.sampleCount) return;

  if (frameData.length % 2 != 0 ||
    (this.options.float && frameData.length % 4 != 0))
    return console.log("check your audio payload, something is clearly wrong");

  const frameBuffer = Utils.createArrayBuffer(frameData);
  const frameView = this.options.float ?
    new Float32Array(frameBuffer) : new Int16Array(frameBuffer);

  const channel = new ArrayBuffer(frameData.length / this.options.channels);
  let view = this.options.float ?
    new Float32Array(channel) : new Int16Array(channel);

  for (let i = 0; i < view.length; i++) {
    if (this.options.downmix == "average") {
      let sum = 0;
      for (let c = 0; c < this.options.channels; c++) {
        sum += frameView[i * this.options.channels + c];
      }
      view[i] = sum / this.options.channels;
    } else {
      view[i] = frameView[i * this.options.channels];
    }

    if (this.options.volume < 100) {
      view[i] *= this.options.volume / 100;
    }
  }

  if (this.resampler != null) {
    view = this.resampler.process_interleaved(channel);
  }

  const encode = (this.options.float || this.resampler ?
    this.encoder.encode_float : this.encoder.encode).bind(this.encoder);

  const encoded = encode(view);

  for (let i = 0; i < encoded.length; i++) {
    this.sendPacket(
      Utils.createBuffer(encoded[i]),
      this.resampler ? view.length : frame.sampleCount
    );
  }
}

function onIPCMessage(msg) {
  if (!msg) return;
  switch (msg.op) {
  case "initialize":
    this.initialize(msg.options);
    break;
  case "enqueue":
    if (this.audioQueue) {
      this.audioQueue.push(msg.frame);
      this.processQueue();
    }
    break;
  case "set":
    this.options[msg.key] = msg.value;
    break;
  }
}

function sendIPC(data) {
  if (!process.connected) {
    this.emit("message", data);
    return;
  }
  process.send(data);
}
function sendPacket(packet, sampleCount) {
  this.sendIPC({
    op: "opuspacket",
    packet: packet,
    sampleCount: sampleCount
  });
}
function sendNeedBuffer() {
  this.sendIPC({op: "needbuffer"});
}

process.on("message", onIPCMessage.bind(EncoderWorker.prototype));
EncoderWorker.prototype.send = onIPCMessage;

EncoderWorker.prototype.initialize = initialize;
EncoderWorker.prototype.processQueue = processQueue;
EncoderWorker.prototype.processAudio = processAudio;
EncoderWorker.prototype.timerCallback = timerCallback;

EncoderWorker.prototype.sendIPC = sendIPC;
EncoderWorker.prototype.sendPacket = sendPacket;
EncoderWorker.prototype.sendNeedBuffer = sendNeedBuffer;

module.exports = EncoderWorker;

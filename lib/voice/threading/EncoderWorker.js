"use strict";

const events = require("events");
const nopus = require("../../../deps/nopus");
const Utils = require("../../core/Utils");
const AudioResampler = require("../AudioResampler");

const DiscordieProfiler = require("../../core/DiscordieProfiler");

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

  // "average", anything else will make it take only first channel
  _options.downmix = _options.downmix;

  // "highres", anything else will just use setTimeout
  _options.timingPrecision = _options.timingPrecision || "normal";

  // "nopus", anything else will just use internal
  _options.resampler = _options.resampler || "internal";

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
    if (this.options.resampler == "nopus") {
      this.resampler = new nopus.Resampler(1,
        this.options.sampleRate, sampleRate,
        this.options.float ? 32 : 16, this.options.float
      );
    } else {
      this.resampler = new AudioResampler(this.options.sampleRate, sampleRate);
    }
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

  // normal precision timing, low cpu usage
  if (this.options.timingPrecision != "highres") {
    this.lastFrame++;
    const frameDuration = this.options.frameDuration;
    const nextTime = this.lastFrame * frameDuration + this.startTime;
    const timeleft = Math.round(nextTime - hrtime());
    setTimeout(this.timerCallback.bind(this), Math.max(timeleft, 0));
    this.processAudio();
    return;
  }

  // high precision timing, high cpu usage
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

  DiscordieProfiler.start("mix");
  var channels = this.options.channels;
  var volume = this.options.volume;
  var viewLength = view.length;

  if (this.options.downmix == "average") {
    var sum = 0;
    for (var i = 0; i < viewLength; i++) {
      sum = 0;
      for (var c = 0; c < channels; c++) {
        sum += frameView[i * channels + c];
      }
      view[i] = sum / channels;

      if (volume < 100) view[i] *= volume / 100;
    }
  } else {
    for (var i = 0; i < viewLength; i++) {
      view[i] = frameView[i * channels];
      if (volume < 100) view[i] *= volume / 100;
    }
  }
  DiscordieProfiler.stop("mix");

  DiscordieProfiler.start("resample");
  if (this.resampler != null) {
    if (this.options.resampler == "nopus") {
      view = this.resampler.process_interleaved(channel);
    } else {
      if (!this.options.float) {
        var floatBuffer = new ArrayBuffer(view.length * 4);
        var floatView = new Float32Array(floatBuffer);
        for (var i = 0; i < floatView.length; i++)
          floatView[i] = view[i] / 32767;
        view = floatView;
      }

      view = this.resampler.process(view);
    }
  }
  DiscordieProfiler.stop("resample");

  DiscordieProfiler.start("encode");
  const encode = (this.options.float || this.resampler ?
    this.encoder.encode_float : this.encoder.encode).bind(this.encoder);

  const encoded = encode(view);
  DiscordieProfiler.stop("encode");

  if (process.env.PROFILEVOICE) {
    let out = "";
    let sum = 0;

    const timediff = (hrtime() - this.startTime);
    const _print = (name, v) => {
      var cpu = v / timediff * 100;
      out += `[${name}] ${v.toFixed(2)}ms ${cpu.toFixed(2)}%cpu; `;
    }

    ["mix", "resample", "encode"].map(n => {
      const v = DiscordieProfiler.get(n);
      if (!this.prof) this.prof = {};
      if (!this.prof[n]) this.prof[n] = 0;
      this.prof[n] += v;
      const vacc = this.prof[n];

      n = n.substr(0, 3).toUpperCase();
      _print(n, vacc);
      sum += vacc;
    });
    _print("TOTAL", sum);
    out += "T: " + timediff.toFixed(2);
    console.log(out);
  }

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
Object.assign(EncoderWorker.prototype, {
  send: onIPCMessage,

  initialize: initialize,
  processQueue: processQueue,
  processAudio: processAudio,
  timerCallback: timerCallback,

  sendIPC: sendIPC,
  sendPacket: sendPacket,
  sendNeedBuffer: sendNeedBuffer,
});

module.exports = EncoderWorker;

"use strict";

const events = require("events");
const nopus = () => require("../../../deps/nopus");
const Utils = require("../../core/Utils");
const Constants = require("../../Constants");
const AudioResampler = require("../AudioResampler");

const DiscordieProfiler = require("../../core/DiscordieProfiler");

var IPC = true;

class EncoderWorker extends events.EventEmitter {
  constructor() {
    super();
    IPC = false;
  }
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

class BaseEncodingEngine {
  constructor(sampleRate, channels, application, frameDuration) {
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.application = application;
    this.frameDuration = frameDuration;
  }
  static isAvailable() {}
  setBitrate(bitrate) {}
  destroy() {}
  encode(buffer) {}
  encode_float(buffer) {}
}

class NativeEncodingEngine extends BaseEncodingEngine {
  constructor(sampleRate, channels, application, frameDuration) {
    super(sampleRate, channels, application, frameDuration);
    this.encoder = new (require("node-opus").OpusEncoder)(
      sampleRate,
      channels,
      application
    );
  }
  static isAvailable() {
    try {
      require("node-opus");
      return true;
    } catch (e) {
      return false;
    }
    return false;
  }
  destroy() {}
  setBitrate(bitrate) {
    return this.encoder.setBitrate(bitrate);
  }
  encode(view) {
    let byteBuffer = new Uint8Array(view.buffer);

    const expectedFrameSize =
      this.sampleRate * (this.frameDuration / 1000) * 2 * this.channels;

    // node-opus doesn't like buffers not matching supported frame sizes
    if (byteBuffer.length < expectedFrameSize) {
      const cut = byteBuffer;
      (byteBuffer = new Uint8Array(expectedFrameSize)).set(cut);
    } else {
      byteBuffer = byteBuffer.subarray(0, expectedFrameSize);
    }

    return [this.encoder.encode(byteBuffer)];
  }
  encode_float(view) {
    if (this.float || view instanceof Float32Array) {
      // node-opus doesn't expose encode_float
      var int16View = new Int16Array(view.length);
      for (var i = 0; i < int16View.length; i++)
        int16View[i] = view[i] * 32767;
      view = int16View;
    }

    return this.encode(view);
  }
}

var coldBoot = true;
class InternalEncodingEngine extends BaseEncodingEngine {
  constructor(sampleRate, channels, application, frameDuration) {
    super(sampleRate, channels, application, frameDuration);
    this.encoder = new (nopus().OpusEncoder)(
      sampleRate,
      channels,
      application,
      frameDuration
    );

    // make V8 compile the code
    if (coldBoot) {
      const samples = this.sampleRate / 1000 * this.frameDuration;
      for (var i = 0; i < 5; i++) {
        this.encode(Utils.allocBuffer(samples * this.channels * 2));
        this.encode_float(Utils.allocBuffer(samples * this.channels * 4));
      }
      coldBoot = false;
    }
  }
  static isAvailable() { return true; }
  setBitrate(bitrate) {
    return this.encoder.set_bitrate(bitrate);
  }
  destroy() {
    return this.encoder.destroy.apply(this.encoder, arguments);
  }
  encode(buffer) {
    return this.encoder.encode.apply(this.encoder, arguments)
      .map(packet => Utils.createBuffer(packet));
  }
  encode_float(buffer) {
    return this.encoder.encode_float.apply(this.encoder, arguments)
      .map(packet => Utils.createBuffer(packet));
  }
}


class BaseResampler {
  constructor(channels, sourceRate, targetRate, bps, float) {
    this.channels = channels;
    this.sourceRate = sourceRate;
    this.targetRate = targetRate;
    this.bps = bps;
    this.float = float;
  }
  destroy() {}
  process_interleaved() {}
}

class SpeexResampler extends BaseResampler {
  constructor(channels, sourceRate, targetRate, bps, float) {
    super(channels, sourceRate, targetRate, bps, float);
    this.resampler = new (nopus().Resampler)(
      channels,
      sourceRate, targetRate,
      bps, float
    );
  }
  destroy() {
    return this.resampler.destroy.apply(this.resampler, arguments);
  }
  process_interleaved() {
    return this.resampler.process_interleaved.apply(this.resampler, arguments);
  }
}

class InternalResampler extends BaseResampler {
  constructor(channels, sourceRate, targetRate, bps, float) {
    super(channels, sourceRate, targetRate, bps, float);
    this.resampler = new AudioResampler(channels, sourceRate, targetRate);
  }
  process_interleaved(buffer) {
    let view = null;
    if (!this.float) {
      if (this.bps == 8) {
        view = new Int8Array(buffer);
      } else if (this.bps == 16) {
        view = new Int16Array(buffer);
      } else if (this.bps == 32) {
        view = new Int32Array(buffer);
      }
      // 24 bps audio nope
    } else {
      view = new Float32Array(buffer);
    }

    if (!view) throw new Error("Unsupported audio format");

    if (!this.float) {
      var floatView = new Float32Array(view.length);
      for (var i = 0; i < floatView.length; i++)
        floatView[i] = view[i] / 32767;
      view = floatView;
    }

    return this.resampler.process(view);
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

  const targetSampleRate = Constants.DISCORD_SAMPLE_RATE;

  _options.frameDuration = _options.frameDuration || 60;
  _options.frameDuration = Math.max(20, Math.min(_options.frameDuration, 60));
  _options.sampleRate = _options.sampleRate || targetSampleRate;
  _options.channels = _options.channels || 1;
  _options.float = _options.float || false;

  // "average", anything else will encode multichannel audio
  _options.downmix = _options.downmix;

  // "highres", anything else will just use setTimeout
  _options.timingPrecision = _options.timingPrecision || "normal";

  // "nopus", anything else will just use internal
  _options.resampler = _options.resampler || "internal";

  // "native", anything else will just use internal
  _options.engine = _options.engine || "internal";

  // proxy mode, passes packets straight to the muxer
  // packets should be opus encoded already
  // in this mode it only works as scheduler for packets
  _options.proxy = _options.proxy || false;

  // OPUS_AUTO          -1000
  // OPUS_BITRATE_MAX   -1
  _options.bitrate = _options.bitrate || null;

  this.options = _options;

  this.encodingChannels = this.options.downmix ?
    1 :
    this.options.channels;

  if (!this.options.proxy) {
    if (this.options.engine == "native") {
      const available = NativeEncodingEngine.isAvailable();
      if (!available) {
        console.warn("Unable to load native opus module (node-opus)");
        console.warn("Audio will be encoded using internal module");
        this.options.engine = "internal";
      }
    }

    const _encodingEngine =
      this.options.engine == "native" ?
        NativeEncodingEngine :
        InternalEncodingEngine;

    this.encoder = new _encodingEngine(
      targetSampleRate,
      this.encodingChannels,
      (nopus().OpusApplication).Audio,
      this.options.frameDuration
    );

    if (this.options.bitrate) {
      this.encoder.setBitrate(this.options.bitrate);
    }

    if (targetSampleRate != this.options.sampleRate) {
      const _resampler =
        this.options.resampler == "nopus" ?
          SpeexResampler :
          InternalResampler;

      this.resampler = new _resampler(this.encodingChannels,
        this.options.sampleRate, targetSampleRate,
        this.options.float ? 32 : 16, this.options.float
      );
    }
  }

  this.failedPackets = 0;
  this.startTime = hrtime();
  this.lastFrame = 0;

  this.audioQueue = [];
}

function processQueue() {
  if (this.audioQueue.length <= 0) return;

  const frameDuration = this.options.frameDuration;
  const lastTime = this.lastFrame * frameDuration + this.startTime;
  if (hrtime() - lastTime > 1000) {
    // put queue into pause mode after 1 second
    // reset scheduler when more data available
    this.startTime = hrtime();
    this.lastFrame = 0;
  }

  setImmediate(this.timerCallback.bind(this));
}

function timerCallback() {
  if (this.encoder == null && !this.options.proxy)
    return;
    //throw new Error("Encoder is not initialized");

  if (!this.audioQueue) return;

  if (this.audioQueue && this.audioQueue.length <= 0) {
    this.sendNeedBuffer();
    return;
  }

  const frameDuration = this.options.frameDuration;
  const nextTime = (this.lastFrame + 1) * frameDuration + this.startTime;

  // normal precision timing, low cpu usage
  if (this.options.timingPrecision != "highres") {
    if (hrtime() < nextTime) {
      const timeleft = Math.round(nextTime - hrtime());

      if (this.nextFrameTimer)
        clearTimeout(this.nextFrameTimer);
      this.nextFrameTimer =
        setTimeout(this.timerCallback.bind(this), Math.max(timeleft, 0));

      return;
    }

    this.lastFrame++;
    this.processAudio();
    return setImmediate(this.timerCallback.bind(this));
  }

  // high precision timing, high cpu usage

  const hiresTimerThreshold = this.options.frameDuration / 4;
  if (hrtime() < nextTime) {
    const timeleft = nextTime - hrtime();

    if (timeleft <= hiresTimerThreshold) {
      return setImmediate(this.timerCallback.bind(this));
    }

    if (this.nextFrameTimer)
      clearTimeout(this.nextFrameTimer);
    this.nextFrameTimer =
      setTimeout(this.timerCallback.bind(this), timeleft / 4);

    return;
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

  if (this.options.proxy) {
    this.sendPacket(frame.chunk, frame.sampleCount);
    return;
  }

  if (frameData.length % 2 != 0 ||
    (this.options.float && frameData.length % 4 != 0))
    return console.log("check your audio payload, buffer size must be even");

  const frameBuffer = Utils.createArrayBuffer(frameData);
  const frameView = this.options.float ?
    new Float32Array(frameBuffer) : new Int16Array(frameBuffer);

  const bufferLength = this.options.downmix == "average" ?
    frameData.length / this.options.channels :
    frameData.length;

  let channel = new ArrayBuffer(bufferLength);
  let view = this.options.float ?
    new Float32Array(channel) : new Int16Array(channel);

  DiscordieProfiler.start("mix");
  // much optimize, var
  var channels = this.options.channels;
  var volume = this.options.volume / 100;
  var viewLength = view.length;

  if (this.options.downmix == "average") {
    var sum = 0;
    for (var i = 0; i < viewLength; i++) {
      sum = 0;
      for (var c = 0; c < channels; c++) {
        sum += frameView[i * channels + c];
      }
      view[i] = sum / channels;

      if (volume < 1) view[i] *= volume;
    }
  } else {
    if (volume < 1) {
      for (var i = 0; i < viewLength; i++) {
        view[i] = frameView[i] * volume;
      }
    } else {
      channel = frameBuffer;
      view = frameView;
    }
  }
  DiscordieProfiler.stop("mix");

  DiscordieProfiler.start("resample");
  if (this.resampler != null) {
    view = this.resampler.process_interleaved(channel);
  }
  DiscordieProfiler.stop("resample");

  DiscordieProfiler.start("encode");
  let encoded;
  const encode = (this.options.float || this.resampler ?
    this.encoder.encode_float : this.encoder.encode).bind(this.encoder);

  encoded = encode(view);
  DiscordieProfiler.stop("encode");

  if (!encoded.length) {
    this.failedPackets++;
    if (this.failedPackets > 3) {
      console.log(
        "failed to encode packet, buffer size might be smaller than expected"
      );
    }
  } else {
    this.failedPackets = 0;
  }

  if (process.env.PROFILEVOICE) {
    let out = "";
    let sum = 0;

    const timediff = (hrtime() - this.startTime);
    const _print = (name, v) => {
      var cpu = v / timediff * 100;
      out += `[${name}] ${v.toFixed(2)}ms ${cpu.toFixed(2)}%cpu; `;
    };

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
      encoded[i],
      this.resampler ?
        (view.length / this.encodingChannels) :
        frame.sampleCount
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
  case "enqueueMultiple":
    if (this.audioQueue) {
      this.audioQueue.push.apply(this.audioQueue, msg.frames);
      this.processQueue();
    }
    break;
  case "clearQueue":
    if (this.audioQueue) {
      this.audioQueue.length = 0;
    }
    break;
  case "set":
    this.options[msg.key] = msg.value;
    break;
  case "setBitrate":
    if (this.encoder) {
      this.options.bitrate = msg.value;
      this.encoder.setBitrate(msg.value);
    }
    break;
  }
}

function sendIPC(data) {
  if (!IPC) {
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

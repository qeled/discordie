"use strict";

const events = require("events");
const nopus = require("../../../deps/nopus");
const Utils = require("../../core/Utils");

class DecoderWorker extends events.EventEmitter {
  kill() {
    if (this.decoder) {
      this.decoder.destroy();
      this.decoder = null;
    }
  }
}

function initialize(_options) {
  if (this.decoder != null) {
    this.decoder.destroy();
  }

  _options.float = _options.float || false;
  _options.channels = _options.channels || 1;
  if (_options.channels < 1) _options.channels = 1;

  this.options = _options;

  const sampleRate = 48000;
  const channels = this.options.channels;
  this.decoder = new nopus.OpusDecoder(sampleRate, channels);
}

function decode(packet) {
  if (!this.decoder)
    throw new Error("Decoder is not initalized");

  let frameData = packet.chunk.data;
  if (packet.chunk instanceof Buffer)
    frameData = packet.chunk;

  if (!packet.chunk || !frameData) return;

  const decode = (this.options.float ?
    this.decoder.decode_float : this.decoder.decode).bind(this.decoder);

  const dataBuffer = new Uint8Array(Utils.createArrayBuffer(frameData));
  const decoded = new Uint8Array(decode(dataBuffer).buffer);

  packet.chunk = Utils.createBuffer(decoded);
  this.sendPacket(packet);
}

function onIPCMessage(msg) {
  if (!msg) return;
  switch (msg.op) {
  case "initialize":
    this.initialize(msg.options);
    break;
  case "enqueue":
    this.decode(msg.packet);
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
    op: "packet",
    packet: packet
  });
}

process.on("message", onIPCMessage.bind(DecoderWorker.prototype));

Object.assign(DecoderWorker.prototype, {
  send: onIPCMessage,

  initialize: initialize,
  decode: decode,

  sendIPC: sendIPC,
  sendPacket: sendPacket,
});

module.exports = DecoderWorker;

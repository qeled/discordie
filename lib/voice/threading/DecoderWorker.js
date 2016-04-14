"use strict";

const events = require("events");
const nopus = () => require("../../../deps/nopus");
const Utils = require("../../core/Utils");
const Constants = require("../../Constants");

var IPC = true;

class DecoderWorker extends events.EventEmitter {
  constructor() {
    super();
    IPC = false;
  }
  kill() {
    this.destroyStates();
  }
}

function destroyStates() {
  if ((this.states || []).length) {
    this.states.forEach(s => s.decoder.destroy());
  }
  this.states = [];
  this.userMap = {};
}

function initialize(_options) {
  this.destroyStates();

  _options.float = _options.float || false;
  _options.channels = _options.channels || 1;
  if (_options.channels < 1) _options.channels = 1;

  this.options = _options;
}

function createDecoder() {
  const channels = this.options.channels;
  return new (nopus().OpusDecoder)(Constants.DISCORD_SAMPLE_RATE, channels);
}

function destroyUnknown() {
  const unknown = this.states.filter(u => !u.userId);
  unknown.forEach(s => {
    s.decoder.destroy();
    const index = this.states.indexOf(s);
    if (index >= 0) this.states.splice(index, 1);
  });
}

function destroyUser(userId) {
  destroyUnknown.call(this);

  const index = this.states.findIndex(s => s.userId == userId);
  if (index < 0) return;
  const state = this.states[index];
  if (state.ssrc) delete this.userMap[state.ssrc];
  state.decoder.destroy();
  this.states.splice(index, 1);
}

function assignUser(ssrc, userId) {
  this.userMap[ssrc] = userId;
  const state = this.states.find(s => s.ssrc == ssrc);
  if (!state || state.userId == userId) return;
  state.decoder.destroy();
  state.decoder = this.createDecoder();
  state.userId = userId;
}

function getOrCreateDecoder(ssrc) {
  let state = this.states.find(s => s.ssrc == ssrc);
  if (!state) {
    state = {
      ssrc: ssrc,
      decoder: this.createDecoder(),
      userId: this.userMap[ssrc] || null
    };
    this.states.push(state);
  }
  return state.decoder;
}

function decode(packet) {
  const decoder = getOrCreateDecoder.call(this, packet.ssrc);

  let frameData = packet.chunk.data;
  if (packet.chunk instanceof Buffer)
    frameData = packet.chunk;

  if (!packet.chunk || !frameData) return;

  const decode = (
    this.options.float ?
      decoder.decode_float :
      decoder.decode
  ).bind(decoder);

  try {
    const dataBuffer = new Uint8Array(Utils.createArrayBuffer(frameData));
    const decoded = new Uint8Array(decode(dataBuffer).buffer);

    packet.chunk = Utils.createBuffer(decoded);
    this.sendPacket(packet);
  } catch (e) { console.error((e instanceof Error ? e : new Error(e)).stack); }
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
  case "assignUser":
    this.assignUser(msg.ssrc, msg.userId);
    break;
  case "destroyUser":
    this.destroyUser(msg.userId);
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

  createDecoder: createDecoder,
  destroyStates: destroyStates,
  assignUser: assignUser,
  destroyUser: destroyUser,
});

module.exports = DecoderWorker;

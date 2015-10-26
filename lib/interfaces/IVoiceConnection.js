"use strict";

const Utils = require("../core/Utils");


function initInterface(_interface, _options) {
  if (!_interface)
    throw new TypeError("Invalid interface");
  if (_options) _interface.initialize(_options);
  return _interface;
}

class IVoiceConnection {
  constructor(discordie, gw) {
    // todo: ssrc to user
    //discordie.Dispatcher.on(Events.VOICE_SPEAKING, e => {
    //  if (e.socket == voicews) this.emit("speaking", - bla - resolve ssrc)
    //});

    this._gatewaySocket = gw;

    if (!this.canStream)
      throw new Error("Failed to create IVoiceConnection");

    this._discordie = discordie;
    Utils.privatify(this);
  }
  dispose() {
    this._gatewaySocket = null;
  }
  get disposed() {
    return !!this._gatewaySocket;
  }
  get _voiceSocket() {
    if (!this._gatewaySocket) return null;
    return this._gatewaySocket.voiceSocket;
  }
  get canStream() {
    return this._voiceSocket && this._voiceSocket.canStream;
  }

  get channel() {
    if (!this._gatewaySocket) return null;
    return this._discordie.Channels.get(
      this._gatewaySocket.voiceState.channelId
    );
  }
  get guild() {
    if (!this._gatewaySocket) return null;
    return this._discordie.Guilds.get(
      this._gatewaySocket.voiceState.guildId
    );
  }

  createEncoderStream(options) {

  }
  createDecoderStream(options) {

  }
  getEncoder(options) {
    if (!this._voiceSocket) return null;
    return initInterface(this._voiceSocket.audioEncoder, options);
  }
  getDecoder(options) {
    if (!this._voiceSocket) return null;
    return initInterface(this._voiceSocket.audioDecoder, options);
  }
}

module.exports = IVoiceConnection;

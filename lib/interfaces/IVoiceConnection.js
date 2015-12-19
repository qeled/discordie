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
    return !this._gatewaySocket;
  }
  get _voiceSocket() {
    if (!this._gatewaySocket) return null;
    return this._gatewaySocket.voiceSocket;
  }
  get canStream() {
    return this._voiceSocket && this._voiceSocket.canStream;
  }

  get channel() {
    const gw = this._gatewaySocket;
    if (!gw) return null;
    return this._discordie.Channels.get(gw.voiceState.channelId);
  }
  get guild() {
    const gw = this._gatewaySocket;
    if (!gw) return null;
    return this._discordie.Guilds.get(gw.voiceState.guildId);
  }

  ssrcToUser(ssrc) {
    const userid = this._discordie._voicestates.ssrcToUserId(this, ssrc);
    if (!userid) return null;
    return this._discordie.Users.get(userid) || null;
  }
  ssrcToMember(ssrc) {
    const userid = this._discordie._voicestates.ssrcToUserId(this, ssrc);
    if (!userid) return null;
    return this._discordie.Users.getMember(this.guild, userid);
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

  disconnect() {
    if (!this._gatewaySocket) return;
    this._gatewaySocket.disconnectVoice();
  }
}

module.exports = IVoiceConnection;

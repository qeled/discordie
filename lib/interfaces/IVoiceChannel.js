"use strict";

const Utils = require("../core/Utils");
const User = require("../models/User");
const IChannel = require("./IChannel");

// todo: multiserver voice

class IVoiceChannel extends IChannel {
  constructor(discordie, channelId) {
    super(discordie, channelId);
  }
  get members() {
    // todo: active members only?
  }
  get joined() {
    // todo: see what happens if we delete all channels with bot streaming
    return this._discordie.gatewaySocket.voiceState.channelId == this.id;
  }
  join(selfMute, selfDeaf, createNewVoiceConnection) {
    const argsArray = [].slice.call(arguments);
    const args = [this.guild_id, this._channelId].concat(argsArray);
    const vc = this._discordie.VoiceConnections;
    return vc._getOrCreate.apply(vc, args);
  }
  leave() {
    const info = this.getVoiceConnectionInfo();
    if (info) info.voiceConnection.disconnect();
  }
  getVoiceConnectionInfo() {
    return this._discordie.VoiceConnections.getForChannel(this._channelId);
  }
}

module.exports = IVoiceChannel;

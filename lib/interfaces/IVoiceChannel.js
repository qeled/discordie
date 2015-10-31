"use strict";

const Utils = require("../core/Utils");
const User = require("../models/User");
const IChannel = require("./IChannel");

class IVoiceChannel extends IChannel {
  constructor(discordie, channelId) {
    super(discordie, channelId);
  }
  get members() {
    return this._discordie.Users.membersInVoiceChannel(this);
  }
  get joined() {
    return !!this.getVoiceConnectionInfo();
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

"use strict";

const DiscordieError = require("../../../core/DiscordieError");

module.exports = function handler(data, gw) {
  // todo: move this error somewhere else
  const user = this.User;
  const isLocal = this.VoiceConnections.isLocalSession(data.session_id);
  const joinedGuildId = gw.voiceState.guildId;
  if (user.id == data.user_id && joinedGuildId == data.guild_id && !isLocal) {
    gw.disconnectVoice(
      false,
      new DiscordieError("Connected from another location")
    );
  }

  if (user.id == data.user_id && joinedGuildId == data.guild_id && isLocal) {
    if (data.channel_id) gw.voiceState.channelId = data.channel_id;
  }

  if (user.id != data.user_id && !data.channel_id) {
    if (gw.voiceSocket && gw.voiceSocket.audioDecoder) {
      gw.voiceSocket.audioDecoder.destroyUser(data.user_id);
    }
  }

  return true;
};

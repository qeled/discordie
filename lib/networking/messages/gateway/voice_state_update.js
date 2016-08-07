"use strict";

const Constants = require("../../../Constants");
const Errors = Constants.Errors;
const DiscordieError = require("../../../core/DiscordieError");

function disconnectVoice(gw, data, errorDescription) {
  return gw.disconnectVoice(
    data.guild_id,
    true, /* noStateUpdate=true */
    new DiscordieError(errorDescription)
  );
}

module.exports = function handler(data, gw) {
  data.guild_id = data.guild_id || null;

  const user = this.User;
  const isLocal = this.VoiceConnections.isLocalSession(data.session_id);

  const localState = gw.voiceStates.get(data.guild_id);

  if (user.id == data.user_id && localState) {
    gw.voiceStateUpdate(
      data.guild_id, data.channel_id,
      data.self_mute, data.self_deaf,
      true /* external=true */
    );

    if (!isLocal) {
      disconnectVoice(gw, data, Errors.VOICE_CONNECTED_FROM_ANOTHER_LOCATION);
    }
    if (!data.channel_id) {
      disconnectVoice(gw, data, Errors.VOICE_KICKED_FROM_CHANNEL);
    }
  }

  if (user.id != data.user_id && !data.channel_id) {
    var voiceSocket = gw.voiceSockets.get(data.guild_id);
    if (voiceSocket && voiceSocket.audioDecoder) {
      voiceSocket.audioDecoder.destroyUser(data.user_id);
    }
  }

  return true;
};

"use strict";

module.exports = function handler(data, gw) {
  data.guild_id = data.guild_id || null;

  gw.createVoiceSocket(
    data.endpoint,
    data.guild_id, data.channel_id, gw.userId,
    gw.sessionId, data.token
  );
  return true;
};

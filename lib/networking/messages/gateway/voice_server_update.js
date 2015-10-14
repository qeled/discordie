"use strict";

module.exports = function handler(data, gw) {
  gw.createVoiceSocket(
    data.endpoint,
    data.guild_id, gw.userId,
    gw.sessionId, data.token
  );
  return true;
};

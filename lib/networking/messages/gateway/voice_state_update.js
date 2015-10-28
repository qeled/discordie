"use strict";

const DiscordieError = require("../../../core/DiscordieError");

module.exports = function handler(data, gw) {
  // todo: move this error somewhere else
  const user = this.User;
  if (user.id == data.user_id && gw.sessionId != data.sessionId)
    gw.disconnectVoice(
      false,
      new DiscordieError("Connected from another location")
    );
  return true;
};

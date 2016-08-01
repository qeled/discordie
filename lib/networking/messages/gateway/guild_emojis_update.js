"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  const guild = this.Guilds.get(data.guild_id);
  if (!guild) return;

  this.Dispatcher.emit(Events.GUILD_EMOJIS_UPDATE, {
    socket: gw,
    guild: guild
  });
  return true;
};

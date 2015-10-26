"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;
  this.Dispatcher.emit(Events.GUILD_UPDATE, {
    socket: gw,
    guild: this.Guilds.get(data.id)
  });
  return true;
};

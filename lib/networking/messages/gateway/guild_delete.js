"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;
  if (data.unavailable) {
    this.Dispatcher.emit(Events.GUILD_UNAVAILABLE, {
      socket: gw,
      guildId: data.id,
      data: data
    });
    return true;
  }

  this.Dispatcher.emit(Events.GUILD_DELETE, {
    socket: gw,
    guildId: data.id,
    data: data
  });
  return true;
};

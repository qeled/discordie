"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;
  if (data.unavailable) {
    this.Dispatcher.emit(Events.GUILD_UNAVAILABLE, {
      socket: gw,
      guildId: data.id
    });
    return true;
  }

  this.Dispatcher.emit(Events.GUILD_CREATE, {
    socket: gw,
    guild: this.Guilds.get(data.id),
    becameAvailable: this.UnavailableGuilds.isGuildAvailable(data)
  });
  return true;
};

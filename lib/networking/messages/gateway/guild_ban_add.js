"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;
  this.Dispatcher.emit(Events.GUILD_BAN_ADD, {
    socket: gw,
    guild: this.Guilds.get(data.guild_id),
    user: this.Users.get(data.user.id)
  });
  return true;
};

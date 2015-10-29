"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const IRole = require("../../../interfaces/IRole");

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;
  this.Dispatcher.emit(Events.GUILD_ROLE_DELETE, {
    socket: gw,
    guild: this.Guilds.get(data.guild_id),
    roleId: data.role_id
  });
  return true;
};

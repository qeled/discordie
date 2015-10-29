"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const IRole = require("../../../interfaces/IRole");

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;
  this.Dispatcher.emit(Events.GUILD_ROLE_CREATE, {
    socket: gw,
    guild: this.Guilds.get(data.guild_id),
    role: new IRole(this, data.role.id, data.guild_id)
  });
  return true;
};

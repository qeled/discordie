"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Utils = require("../../../core/Utils");

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  const cached = data._cached; delete data._cached;

  if (!this.Dispatcher.hasListeners(Events.GUILD_ROLE_DELETE)) return true;

  this.Dispatcher.emit(Events.GUILD_ROLE_DELETE, {
    socket: gw,
    guild: this.Guilds.get(data.guild_id),
    roleId: data.role_id,
    getCachedData: () => Utils.modelToObject(cached || null)
  });
  return true;
};

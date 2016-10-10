"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Utils = require("../../../core/Utils");

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  const cached = data._cached; delete data._cached;

  if (!this.Dispatcher.hasListeners(Events.GUILD_MEMBER_REMOVE)) return true;

  if (data.user && data.user.id === this._user.id) return true;

  this.Dispatcher.emit(Events.GUILD_MEMBER_REMOVE, {
    socket: gw,
    guild: this.Guilds.get(data.guild_id),
    user: this.Users.get(data.user.id),
    data: data,
    getCachedData: () => Utils.modelToObject(cached || null)
  });
  return true;
};

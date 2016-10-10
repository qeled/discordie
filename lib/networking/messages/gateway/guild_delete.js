"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Utils = require("../../../core/Utils");

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

  const cached = data._cached; delete data._cached;

  if (!this.Dispatcher.hasListeners(Events.GUILD_DELETE)) return true;

  this.Dispatcher.emit(Events.GUILD_DELETE, {
    socket: gw,
    guildId: data.id,
    data: data,
    getCachedData: () => Utils.modelToObject(cached || null)
  });
  return true;
};

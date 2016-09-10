"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Utils = require("../../../core/Utils");

module.exports = function handler(data, gw) {
  const prev = data._prev; delete data._prev;
  const next = data._next; delete data._next;

  if (!gw.isPrimary) return true;

  if (!this.Dispatcher.hasListeners(Events.GUILD_EMOJIS_UPDATE)) return true;

  const guild = this.Guilds.get(data.guild_id);
  if (!guild) return;

  this.Dispatcher.emit(Events.GUILD_EMOJIS_UPDATE, {
    socket: gw,
    guild: guild,
    getChanges: () => ({
      before: Utils.modelToObject(prev),
      after: Utils.modelToObject(next)
    })
  });
  return true;
};

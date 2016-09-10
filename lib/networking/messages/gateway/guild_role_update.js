"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Utils = require("../../../core/Utils");
const IRole = require("../../../interfaces/IRole");

module.exports = function handler(data, gw) {
  const prev = data._prev; delete data._prev;
  const next = data._next; delete data._next;

  if (!gw.isPrimary) return true;

  if (!this.Dispatcher.hasListeners(Events.GUILD_ROLE_UPDATE)) return true;

  this.Dispatcher.emit(Events.GUILD_ROLE_UPDATE, {
    socket: gw,
    guild: this.Guilds.get(data.guild_id),
    role: new IRole(this, data.role.id, data.guild_id),
    getChanges: () => ({
      before: Utils.modelToObject(prev),
      after: Utils.modelToObject(next)
    })
  });
  return true;
};

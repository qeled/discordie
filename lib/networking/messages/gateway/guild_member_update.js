"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Utils = require("../../../core/Utils");
const IRole = require("../../../interfaces/IRole");

function diffArray(a, b) {
  return a.filter(id => b.indexOf(id) < 0);
}

function filterExistingRoles(roleIds, guildId) {
  const guild = this._guilds.get(guildId);
  if (!guild) return [];
  return roleIds.filter(id => guild.roles.get(id));
}
function mapRoles(ids, guildId) {
  return filterExistingRoles.call(this, ids, guildId)
    .map(id => new IRole(this, id, guildId));
}

module.exports = function handler(data, gw) {
  const prev = data._prev; delete data._prev;
  const next = data._next; delete data._next;

  if (!gw.isPrimary) return true;

  if (!this.Dispatcher.hasListeners(Events.GUILD_MEMBER_UPDATE)) return true;

  const event = {
    socket: gw,
    guild: this.Guilds.get(data.guild_id),
    member: this.Users.getMember(data.guild_id, data.user.id),
    rolesAdded: [],
    rolesRemoved: [],
    previousNick: null,
    getChanges: () => ({
      before: Utils.modelToObject(prev),
      after: Utils.modelToObject(next)
    })
  };

  if (prev && next) {
    if (Array.isArray(prev.roles) && Array.isArray(next.roles)) {
      const rolesAdded = diffArray(next.roles, prev.roles);
      const rolesRemoved = diffArray(prev.roles, next.roles);
      const rolesChanged = rolesAdded.length || rolesRemoved.length;
      if (rolesChanged) {
        event.rolesAdded = mapRoles.call(this, rolesAdded, data.guild_id);
        event.rolesRemoved = mapRoles.call(this, rolesRemoved, data.guild_id);
      }
    }

    event.previousNick = prev.nick;
  }

  this.Dispatcher.emit(Events.GUILD_MEMBER_UPDATE, event);
  return true;
};

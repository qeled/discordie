"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  if (!this.Dispatcher.hasListeners(Events.PRESENCE_UPDATE)) return true;

  if (this.User.id != data.user.id) {
    // Presences for friends are emitted without `guild_id`
    if (!data.guild_id) return true;

    var user = this.Users.get(data.user.id);
    var member = this.Users.getMember(data.guild_id, data.user.id) || user;
    var guild = this.Guilds.get(data.guild_id);

    this.Dispatcher.emit(Events.PRESENCE_UPDATE, {
      socket: gw,
      guild, user, member
    });
  }
  return true;
};

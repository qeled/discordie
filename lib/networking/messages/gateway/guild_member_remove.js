"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  if (data.user && data.user.id === this._user.id) return true;

  this.Dispatcher.emit(Events.GUILD_MEMBER_REMOVE, {
    socket: gw,
    guild: this.Guilds.get(data.guild_id),
    user: this.Users.get(data.user.id),
    data: data
  });
  return true;
};

"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;
  this.Dispatcher.emit(Events.GUILD_MEMBER_ADD, {
    socket: gw,
    guild: this.Guilds.get(data.guild_id),
    member: this.Users.getMember(data.guild_id, data.user.id)
  });
  return true;
};

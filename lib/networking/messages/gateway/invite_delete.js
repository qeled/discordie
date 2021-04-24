"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  if (!this.Dispatcher.hasListeners(Events.INVITE_DELETE)) return true;

  const guild = this.Guilds.get(data.guild_id)
  const channel = this.Channels.get(data.channel_id)

  this.Dispatcher.emit(Events.INVITE_DELETE, {
    gw: gw,
    guild, channel,
    code: data.code
  });
  return true;
};

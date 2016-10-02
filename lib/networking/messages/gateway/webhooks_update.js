"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  const guild = this.Guilds.get(data.guild_id);
  const channel = this.Channels.get(data.channel_id);
  if (!guild || !channel) return true;

  this.Dispatcher.emit(Events.WEBHOOKS_UPDATE, {
    socket: gw,
    guild, channel, data
  });
  return true;
};

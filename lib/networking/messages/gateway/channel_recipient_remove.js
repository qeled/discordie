"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  const channel = this.DirectMessageChannels.get(data.channel_id);
  const user = this.Users.get(data.user && data.user.id);
  if (!channel || !user) return true;

  this.Dispatcher.emit(Events.CHANNEL_RECIPIENT_REMOVE, {
    socket: gw,
    channel: channel,
    user: user
  });
  return true;
};

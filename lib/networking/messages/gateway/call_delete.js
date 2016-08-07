"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  const channel = this.DirectMessageChannels.get(data.channel_id);
  if (!channel) return true;

  if (data.unavailable) {
    this.Dispatcher.emit(Events.CALL_UNAVAILABLE, {
      socket: gw,
      channelId: data.channel_id,
      data: data
    });
    return true;
  }

  this.Dispatcher.emit(Events.CALL_DELETE, {
    socket: gw,
    channelId: data.channel_id,
    data: data
  });
  return true;
};

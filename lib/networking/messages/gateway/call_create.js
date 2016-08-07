"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  const channel = this.DirectMessageChannels.get(data.channel_id);
  if (!channel) return true;

  this.Dispatcher.emit(Events.CALL_CREATE, {
    socket: gw,
    channel: channel,
    call: channel.call
  });
  return true;
};

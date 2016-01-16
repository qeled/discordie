"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;
  this.Dispatcher.emit(Events.MESSAGE_DELETE, {
    socket: gw,
    channelId: data.channel_id,
    messageId: data.id,
    message: this.Messages.get(data.id)
  });
  return true;
};

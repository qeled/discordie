"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;
  this.Dispatcher.emit(Events.CHANNEL_CREATE, {
    socket: gw,
    channel: this.Channels.get(data.id) ||
             this.DirectMessageChannels.get(data.id)
  });
  return true;
};

"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;
  this.Dispatcher.emit(Events.CHANNEL_DELETE, {
    socket: gw,
    channelId: data.id,
    data: data
  });
  return true;
};

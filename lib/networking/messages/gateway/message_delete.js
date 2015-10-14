"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  this.Dispatcher.emit(Events.MESSAGE_DELETE, {
    socket: gw,
    //messageId: data.id,
    //channelId: data.channel,
    message: this.Messages.get(data.id)
  });
  return true;
};

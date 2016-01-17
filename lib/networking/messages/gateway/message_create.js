"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  const message = this.Messages.get(data.id);
  if (!message) return true;

  this.Dispatcher.emit(Events.MESSAGE_CREATE, {
    socket: gw,
    message: message
  });
  return true;
};

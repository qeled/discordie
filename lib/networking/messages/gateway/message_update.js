"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;
  this.Dispatcher.emit(Events.MESSAGE_UPDATE, {
    socket: gw,
    message: this.Messages.get(data.id),
    data: data
  });
  return true;
};

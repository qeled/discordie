"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;
  this.Dispatcher.emit(Events.GATEWAY_RESUMED, {
    socket: gw,
    data: data
  });
  return true;
};

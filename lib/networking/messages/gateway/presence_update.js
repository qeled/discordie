"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (this.User.id != data.user.id) {
    this.Dispatcher.emit(Events.PRESENCE_UPDATE, {
      socket: gw,
      user: this.Users.get(data.user.id)
    });
  }
  return true;
};

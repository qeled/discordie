"use strict";

/*const schema = {

};

function handler(data) {

}

module.exports = MessageValidator(schema, handler);
*/

const Constants = require("../../../Constants");
const Events = Constants.Events;
const User = require("../../../models/User");
const AuthenticatedUser = require("../../../models/AuthenticatedUser");

module.exports = function handler(data, gw) {
  if (gw.isPrimary) {
    this._user = new AuthenticatedUser(data.user);

    this.Dispatcher.emit(Constants.Events.GATEWAY_READY, {
      socket: gw,
      data: data
    });
    // todo: fire GUILD_UNAVAILABLE for every guildId here?
  }

  this.Dispatcher.emit(Constants.Events.ANY_GATEWAY_READY, {
    socket: gw,
    data: data
  });
  return true;
};

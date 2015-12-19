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

    this.Dispatcher.emit(Events.GATEWAY_READY, {
      socket: gw,
      data: data
    });

    if (data && data.guilds && data.guilds.length) {
      data.guilds.forEach(guild => {
        if (!guild || !guild.unavailable) return;
        this.Dispatcher.emit(Events.GUILD_UNAVAILABLE, {
          socket: gw,
          guildId: guild.id
        });
      });
    }
  }

  this.Dispatcher.emit(Events.ANY_GATEWAY_READY, {
    socket: gw,
    data: data
  });
  return true;
};

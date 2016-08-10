"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const User = require("../../../models/User");
const AuthenticatedUser = require("../../../models/AuthenticatedUser");

module.exports = function handler(data, gw) {
  if (gw.isPrimary) {
    this._user = new AuthenticatedUser(data.user);
    this.bot = this._user.bot;

    // GW V4 READY emits all guilds as unavailable and
    // implements data streaming with GUILD_CREATE

    // GATEWAY_READY event has been moved to ReadyEventScheduler
  }
  return true;
};

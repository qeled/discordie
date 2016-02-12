"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(guildId, channels) {
  return new Promise((rs, rj) => {
    apiRequest
    .patch(Endpoints.GUILD_CHANNELS(guildId))
    .auth(this.token)
    .send(channels)
    .end((err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
}

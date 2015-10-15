"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId) {
  return new Promise((rs, rj) => {
    apiRequest
    .post(Endpoints.GUILD_ROLES(guildId))
    .auth(this.token)
    .end((err, res) => {
      if (!res.ok)
        return rj(err);

      rs(res.body);
    });
  });
}

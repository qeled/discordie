"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(guildId) {
  return new Promise((rs, rj) => {
    apiRequest
    .get(this, guildId ? Endpoints.GUILD_REGIONS(guildId) : Endpoints.REGIONS)
    .send((err, res) => {
      if (err || !res.ok)
        return rj(err);

      rs(res.body);
    });
  });
};

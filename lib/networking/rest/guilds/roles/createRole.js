"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .post(this, Endpoints.GUILD_ROLES(guildId));

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._guilds.updateRole(guildId, res.body);
      rs(res.body);
    });
  });
};

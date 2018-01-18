"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId, userId, reason) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .del(this, {
      url: `${Endpoints.GUILD_BANS(guildId)}/${userId}`,
      query: {
        reason: reason
      }
    });

    this._queueManager.put(request, (err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId, days) {
  if (days === undefined) days = 7;
  if (days <= 1) days = 1;
  return new Promise((rs, rj) => {
    var request = apiRequest
    .post(this, {
      url: Endpoints.GUILD_PRUNE(guildId),
      query: {days: days}
    });

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok) return rj(err);
      return rs({
        guildId: guildId,
        days: days,
        pruned: res.body.pruned
      });
    });
  });
};

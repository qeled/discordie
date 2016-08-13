"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(guildId, channels) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .patch(this, {
      url: Endpoints.GUILD_CHANNELS(guildId),
      body: channels
    });

    this._queueManager.put(request, (err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

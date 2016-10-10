"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId, image, name) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .post(this, {
      url: Endpoints.GUILD_EMOJIS(guildId),
      body: { image, name }
    });

    this._queueManager.put(request, (err, res) => {
      return (!err && res.ok) ? rs(res.body) : rj(err);
    });
  });
};

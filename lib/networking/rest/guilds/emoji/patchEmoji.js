"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId, emojiId, options) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .patch(this, {
      url: Endpoints.GUILD_EMOJI(guildId, emojiId),
      body: options
    });

    this._queueManager.put(request, (err, res) => {
      return (!err && res.ok) ? rs(res.body) : rj(err);
    });
  });
};

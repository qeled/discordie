"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(guildId, options) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .patch(this, {
      url: Endpoints.GUILD_EMBED(guildId),
      body: {
        enabled: options.enabled,
        channel_id: options.channelId !== undefined ?
          options.channelId :
          options.channel_id
      }
    });

    this._queueManager.put(request, (err, res) => {
      return (!err && res.ok) ? rs(res.body) : rj(err);
    });
  });
};

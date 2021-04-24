"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, messageId, emoji, userId) {
  emoji = encodeURIComponent(emoji);

  return new Promise((rs, rj) => {
    var request = apiRequest
      .del(this, Endpoints.REACTIONS_EMOJI(channelId, messageId, emoji));

    const route =
      Endpoints.REACTIONS_EMOJI(channelId, ":messageId", ":emoji");

    this._queueManager.putToRoute(request, route, (err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

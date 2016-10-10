"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, messageId, emoji) {
  emoji = encodeURIComponent(emoji);

  return new Promise((rs, rj) => {
    var request = apiRequest
    .put(this, Endpoints.REACTION(channelId, messageId, emoji, "@me"));

    const route =
      Endpoints.REACTION(channelId, ":messageId", ":emoji", ":userId");

    this._queueManager.putToRoute(request, route, (err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

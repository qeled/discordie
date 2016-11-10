"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, messageId) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .del(this, Endpoints.REACTIONS(channelId, messageId));

    const route =
      Endpoints.REACTIONS(channelId, ":messageId");

    this._queueManager.putToRoute(request, route, (err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

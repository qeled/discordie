"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .get(this, Endpoints.INSTANT_INVITES(channelId));

    this._queueManager.put(request, (err, res) => {
      return (!err && res.ok) ? rs(res.body) : rj(err);
    });
  });
};

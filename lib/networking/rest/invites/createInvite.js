"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, options) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .post(this, {
      url: Endpoints.INSTANT_INVITES(channelId),
      body: options
    });

    this._queueManager.put(request, (err, res) => {
      return (!err && res.ok) ? rs(res.body) : rj(err);
    });
  });
};

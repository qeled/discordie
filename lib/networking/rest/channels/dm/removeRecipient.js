"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(channelId, userId) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .del(this, `${Endpoints.CHANNEL_RECIPIENTS(channelId)}/${userId}`);

    this._queueManager.put(request, (err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

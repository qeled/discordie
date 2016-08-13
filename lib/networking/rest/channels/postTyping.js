"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .post(this, Endpoints.TYPING(channelId));

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      // todo: do something? fire TYPING on setTimeout?
      rs();
    });
  });
};

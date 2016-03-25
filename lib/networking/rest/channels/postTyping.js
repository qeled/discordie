"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId) {
  return new Promise((rs, rj) => {
    apiRequest
    .post(this, Endpoints.TYPING(channelId))
    .send((err, res) => {
      if (err || !res.ok)
        return rj(err);

      // todo: do something? fire TYPING on setTimeout?
      rs();
    });
  });
};

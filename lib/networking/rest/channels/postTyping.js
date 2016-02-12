"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId) {
  return new Promise((rs, rj) => {
    apiRequest
    .post(Endpoints.TYPING(channelId))
    .auth(this.token)
    .end((err, res) => {
      if (err || !res.ok)
        return rj(err);

      // todo: do something? fire TYPING on setTimeout?
      rs();
    });
  });
}

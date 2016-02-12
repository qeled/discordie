"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, options) {
  return new Promise((rs, rj) => {
    apiRequest
    .post(Endpoints.INSTANT_INVITES(channelId))
    .auth(this.token)
    .send(options)
    .end((err, res) => {
      return (!err && res.ok) ? rs(res.body) : rj(err);
    });
  });
}

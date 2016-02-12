"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId) {
  return new Promise((rs, rj) => {
    apiRequest
    .get(Endpoints.INSTANT_INVITES(channelId))
    .auth(this.token)
    .end((err, res) => {
      return (!err && res.ok) ? rs(res.body) : rj(err);
    });
  });
}

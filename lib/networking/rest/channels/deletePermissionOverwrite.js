"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, overwriteId) {
  return new Promise((rs, rj) => {
    apiRequest
    .del(`${Endpoints.CHANNEL_PERMISSIONS(channelId)}/${overwriteId}`)
    .auth(this.token)
    .end((err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
}

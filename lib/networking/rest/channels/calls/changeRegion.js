"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(channelId, region) {
  return new Promise((rs, rj) => {
    apiRequest
    .patch(this, {
      url: Endpoints.CALL(channelId),
      body: {region}
    })
    .send((err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

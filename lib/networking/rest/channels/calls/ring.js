"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(channelId, recipients) {
  return new Promise((rs, rj) => {
    apiRequest
    .post(this, {
      url: Endpoints.CALL_RING(channelId),
      body: recipients ? {recipients} : []
    })
    .send((err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

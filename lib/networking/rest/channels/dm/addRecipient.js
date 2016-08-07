"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(channelId, userId) {
  return new Promise((rs, rj) => {
    apiRequest
    .put(this, `${Endpoints.CHANNEL_RECIPIENTS(channelId)}/${userId}`)
    .send((err, res) => {
      if (err || !res.ok)
        return rj(err);

      const HTTP_CREATED = 201;
      rs(res.status === HTTP_CREATED ? res.body.id : channelId);
    });
  });
};

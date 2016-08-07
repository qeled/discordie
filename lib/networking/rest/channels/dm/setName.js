"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(channelId, name) {
  return new Promise((rs, rj) => {
    apiRequest
    .patch(this, {
      url: `${Endpoints.CHANNELS}/${channelId}`,
      body: {name}
    })
    .send((err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._channels.update(res.body);
      rs(res.body);
    });
  });
};

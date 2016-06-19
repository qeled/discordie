"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, messageId) {
  return new Promise((rs, rj) => {
    apiRequest
    .del(this, `${Endpoints.PINS(channelId)}/${messageId}`)
    .send((err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._messages.update({
        id: messageId, channel_id: channelId,
        pinned: false
      });
      rs();
    });
  });
};

"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, messageId) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .put(this, `${Endpoints.PINS(channelId)}/${messageId}`);

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._messages.update({
        id: messageId, channel_id: channelId,
        pinned: true
      });
      rs();
    });
  });
};

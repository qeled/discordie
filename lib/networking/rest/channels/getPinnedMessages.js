"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .get(this, Endpoints.PINS(channelId));

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      const event = {
        channelId: channelId,
        messages: res.body
      };
      this.Dispatcher.emit(Events.LOADED_PINNED_MESSAGES, event);
      rs(event);
    });
  });
};

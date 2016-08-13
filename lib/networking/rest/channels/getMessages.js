"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, limit, before, after) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .get(this, {
      url: Endpoints.MESSAGES(channelId),
      query: {
        before: before || undefined,
        after: after || undefined,
        limit: limit
      }
    });

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      const event = {
        messages: res.body,
        limit: limit,
        before: before,
        after: after
      };
      this.Dispatcher.emit(Events.LOADED_MORE_MESSAGES, event);
      rs(event);
    });
  });
};

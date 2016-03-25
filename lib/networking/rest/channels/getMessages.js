"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, limit, before, after) {
  before = before || null;
  after = after || null;

  return new Promise((rs, rj) => {
    apiRequest
    .get(this, {
      url: Endpoints.MESSAGES(channelId),
      query: {
        before: before,
        after: after,
        limit: limit
      }
    })
    .send((err, res) => {
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

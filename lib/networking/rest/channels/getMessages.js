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
    .get(Endpoints.MESSAGES(channelId))
    .auth(this.token)
    .query({
      before: before,
      after: after,
      limit: limit
    })
    .end((err, res) => {
      if (!res.ok)
        return rj(err);

      const event = {
        messages: res.body,
        isBefore: before != null,
        isAfter: after != null,
        hasMore: limit !== null ? res.body.length === limit : null
      };
      this.Dispatcher.emit(Events.LOADED_MORE_MESSAGES, event);
      rs(event);
    });
  });
}

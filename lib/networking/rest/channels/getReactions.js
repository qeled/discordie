"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, messageId, emoji, limit, after) {
  emoji = encodeURIComponent(emoji);

  return new Promise((rs, rj) => {
    var request = apiRequest
    .get(this, {
      url: Endpoints.REACTIONS_EMOJI(channelId, messageId, emoji),
      query: {
        limit: limit,
        after: after || undefined
      }
    });

    const route =
      Endpoints.REACTIONS_EMOJI(channelId, ":messageId", ":emoji");

    this._queueManager.putToRoute(request, route, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      if (Array.isArray(res.body)) {
        res.body.forEach(user => this._users.update(user));
      }

      rs(res.body);
    });
  });
};

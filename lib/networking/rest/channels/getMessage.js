"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, messageId, updateCache) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .get(this, `${Endpoints.MESSAGES(channelId)}/${messageId}`);

    const route = `${Endpoints.MESSAGES(channelId)}/:messageId`;

    this._queueManager.putToRoute(request, route, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      if (updateCache) {
        const event = {
          messages: [res.body],
          limit: 1
        };
        this.Dispatcher.emit(Events.LOADED_MORE_MESSAGES, event);
      }

      rs(res.body);
    });
  });
};

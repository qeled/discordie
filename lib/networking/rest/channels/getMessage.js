"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, messageId) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .get(this, {
      url: Endpoints.MESSAGE(channelId, messageId)
    });

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      const event = {
        message: res.body
      };
      this.Dispatcher.emit(Events.LOADED_MORE_MESSAGES, {
          messages: [res.body]
      });
      rs(event);
    });
  });
};

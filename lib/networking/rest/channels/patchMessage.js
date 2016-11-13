"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, messageId, content, embed) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .patch(this, {
      url: `${Endpoints.MESSAGES(channelId)}/${messageId}`,
      body: {content, embed}
    });

    this._queueManager.putMessage(request, channelId, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._messages.update(res.body);
      rs(res.body);
    });
  });
};

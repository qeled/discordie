"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, messages) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .post(this, {
      url: `${Endpoints.MESSAGES(channelId)}/bulk-delete`,
      body: {messages: messages}
    });

    this._queueManager.putBulkDeleteMessage(request, channelId, (err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

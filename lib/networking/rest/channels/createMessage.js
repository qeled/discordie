"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

function createNonce() {
  return (Math.random() * Math.pow(2,53)).toString(10).slice(8) +
    (Math.random() * Math.pow(2,53)).toString(10).slice(8);
}

module.exports = function(channelId, content, mentions, tts, embed) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .post(this, {
      url: Endpoints.MESSAGES(channelId),
      body: {
        content: content || "",
        mentions: mentions || [],
        nonce: createNonce(),
        tts: !!tts,
        embed
      }
    });

    this._queueManager.putMessage(request, channelId, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._messages.create(res.body);
      rs(res.body);
    });
  });
};

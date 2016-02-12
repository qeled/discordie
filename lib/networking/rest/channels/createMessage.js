"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

function createNonce() {
  return (Math.random() * Math.pow(2,53)).toString(10).slice(8) +
    (Math.random() * Math.pow(2,53)).toString(10).slice(8);
}

module.exports = function(channelId, content, mentions, tts) {
  return new Promise((rs, rj) => {
    apiRequest
    .post(Endpoints.MESSAGES(channelId))
    .auth(this.token)
    .send({
      content: content || "",
      mentions: mentions || [],
      nonce: createNonce(),
      tts: !!tts
    })
    .end((err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._messages.update(res.body);
      rs(res.body);
    });
  });
}

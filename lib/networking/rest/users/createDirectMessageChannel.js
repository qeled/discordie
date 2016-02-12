"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(userId, recipientId) {
  return new Promise((rs, rj) => {
    apiRequest
    .post(Endpoints.USER_CHANNELS(userId))
    .auth(this.token)
    .send({recipient_id: recipientId})
    .end((err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._channels.mergeOrSet(res.body.id, res.body);
      rs(res.body);
    });
  });
}

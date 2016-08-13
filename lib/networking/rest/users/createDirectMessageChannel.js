"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(userId, recipients) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .post(this, {
      url: Endpoints.USER_CHANNELS(userId),
      body: {recipients: recipients}
    });

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._channels.update(res.body);
      rs(res.body);
    });
  });
};

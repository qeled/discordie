"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(userId) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .get(this, {
      url: Endpoints.USER_INFO(userId)
    });

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      rs(res.body);
    });
  });
};

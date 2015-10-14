"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function() {
  return new Promise((rs, rj) => {
    apiRequest
    .get(Endpoints.REGIONS)
    .auth(this.token) // do we need auth here?
    .end((err, res) => {
      if (!res.ok)
        return rj(err);

      rs(res.body);
    });
  });
}

"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(id) {
  return new Promise((rs, rj) => {
    apiRequest
    .get(this, Endpoints.OAUTH2_APPLICATION(id))
    .send((err, res) => {
      return (!err && res.ok) ? rs(res.body) : rj(err);
    });
  });
};

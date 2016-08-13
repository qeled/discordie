"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(code) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .get(this, `${Endpoints.INVITE}/${code}`);

    this._queueManager.putToRoute(request, Endpoints.INVITE, (err, res) => {
      return (!err && res.ok) ? rs(res.body) : rj(err);
    });
  });
};

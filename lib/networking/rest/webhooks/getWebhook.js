"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(webhookId, token) {
  return new Promise((rs, rj) => {
    const endpoint = token ?
      `${Endpoints.WEBHOOK(webhookId)}/${token}` :
      `${Endpoints.WEBHOOK(webhookId)}`;

    var request = apiRequest
    .get(this, endpoint);

    const route = Endpoints.WEBHOOK(webhookId);
    this._queueManager.putToRoute(request, route, (err, res) => {
      return (!err && res.ok) ? rs(res.body) : rj(err);
    });
  });
};

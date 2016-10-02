"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(webhookId, token, options, wait) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .post(this, {
      url: `${Endpoints.WEBHOOK(webhookId)}/${token}/slack`,
      query: wait != null ? {wait: !!wait} : {},
      body: options
    });

    const route = Endpoints.WEBHOOK(webhookId);
    this._queueManager.putToRoute(request, route, (err, res) => {
      return (!err && res.ok) ? rs(res.body) : rj(err);
    });
  });
};

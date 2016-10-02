"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(webhookId, token, options) {
  return new Promise((rs, rj) => {
    const endpoint = token ?
      `${Endpoints.WEBHOOK(webhookId)}/${token}` :
      `${Endpoints.WEBHOOK(webhookId)}`;

    const body = {
      channel_id: options.channelId || options.channel_id || undefined,
      name: options.name || undefined
    };
    if (options.avatar !== undefined) body.avatar = options.avatar;

    var request = apiRequest
    .patch(this, {
      url: endpoint,
      body
    });

    const route = Endpoints.WEBHOOK(webhookId);
    this._queueManager.putToRoute(request, route, (err, res) => {
      return (!err && res.ok) ? rs(res.body) : rj(err);
    });
  });
};

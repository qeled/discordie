"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(channelId, icon) {
  icon = icon || null;

  return new Promise((rs, rj) => {
    var request = apiRequest
    .patch(this, {
      url: `${Endpoints.CHANNELS}/${channelId}`,
      body: {icon}
    });

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._channels.update(res.body);
      rs(res.body);
    });
  });
};

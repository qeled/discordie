"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, overwrite) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .put(this, {
      url: `${Endpoints.CHANNEL_PERMISSIONS(channelId)}/${overwrite.id}`,
      body: overwrite
    });

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._channels.updatePermissionOverwrite(channelId, overwrite);
      rs(overwrite);
    });
  });
};

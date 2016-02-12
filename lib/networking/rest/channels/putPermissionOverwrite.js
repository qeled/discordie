"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, overwrite) {
  return new Promise((rs, rj) => {
    apiRequest
    .put(`${Endpoints.CHANNEL_PERMISSIONS(channelId)}/${overwrite.id}`)
    .auth(this.token)
    .send(overwrite)
    .end((err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._channels.updatePermissionOverwrite(channelId, overwrite);
      rs(overwrite);
    });
  });
}

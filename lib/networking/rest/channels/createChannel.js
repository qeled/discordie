"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(guildId, type, name) {
  return new Promise((rs, rj) => {
    apiRequest
    .post(Endpoints.GUILD_CHANNELS(guildId))
    .auth(this.token)
    .send({
      type: type,
      name: name
    })
    .end((err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._channels.update(res.body);
      rs(res.body);
    });
  });
}

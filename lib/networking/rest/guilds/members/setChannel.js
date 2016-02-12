"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId, userId, channelId) {
  return new Promise((rs, rj) => {
    apiRequest
    .patch(`${Endpoints.GUILD_MEMBERS(guildId)}/${userId}`)
    .auth(this.token)
    .send({channel_id: channelId})
    .end((err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
}

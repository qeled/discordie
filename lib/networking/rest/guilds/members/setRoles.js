"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId, userId, roles) {
  return new Promise((rs, rj) => {
    apiRequest
    .patch(`${Endpoints.GUILD_MEMBERS(guildId)}/${userId}`)
    .auth(this.token)
    .send({roles: roles})
    .end((err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
}

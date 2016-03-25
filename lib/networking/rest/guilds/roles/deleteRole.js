"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId, roleId) {
  return new Promise((rs, rj) => {
    apiRequest
    .del(this, `${Endpoints.GUILD_ROLES(guildId)}/${roleId}`)
    .send((err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

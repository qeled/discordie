"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId, userId, mute) {
  return new Promise((rs, rj) => {
    apiRequest
    .patch(this, {
      url: `${Endpoints.GUILD_MEMBERS(guildId)}/${userId}`,
      body: {mute: mute}
    })
    .send((err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId, roles) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .patch(this, {
      url: Endpoints.GUILD_ROLES(guildId),
      body: roles
    });

    this._queueManager.put(request, (err, res) => {
      // the server returns an array of roles, but we don't really need that
      // it doesn't return anything for batchPatchChannels

      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId, name, color, permissions, hoist, mentionable) {
  return new Promise((rs, rj) => {
    const role = {};
    if (name) role.name = name;
    if (color) role.color = color;
    if (permissions != null) role.permissions = permissions;
    if (hoist != null) role.hoist = hoist;
    if (mentionable != null) role.mentionable = mentionable;

    var request = apiRequest
    .post(this, {
      url: Endpoints.GUILD_ROLES(guildId),
      body: role
    });

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._guilds.updateRole(guildId, res.body);
      rs(res.body);
    });
  });
};

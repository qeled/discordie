"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId, roleId, name, permissions, color, hoist) {
  return new Promise((rs, rj) => {
    apiRequest
    .patch(`${Endpoints.GUILD_ROLES(guildId)}/${roleId}`)
    .auth(this.token)
    .send({
      name: name,
      permissions: permissions,
      color: color,
      hoist: hoist
    })
    .end((err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._guilds.updateRole(guildId, res.body);
      rs(res.body);
    });
  });
}

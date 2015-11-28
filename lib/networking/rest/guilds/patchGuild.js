"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(guildId,
                          name, icon, region, afkChannelId, afkTimeout) {
  icon = icon || null;

  return new Promise((rs, rj) => {
    apiRequest
    .patch(`${Endpoints.GUILDS}/${guildId}`)
    .auth(this.token)
    .send({
      name: name,
      icon: icon,
      region: region,
      afk_channel_id: afkChannelId,
      afk_timeout: afkTimeout
    })
    .end((err, res) => {
      if (!res.ok)
        return rj(err);

      this._guilds.update(res.body);
      rs(res.body);
    });
  });
}

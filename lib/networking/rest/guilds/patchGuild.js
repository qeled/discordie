"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(guildId,
                          name, icon, region,
                          afkChannelId, afkTimeout,
                          verificationLevel) {
  icon = icon || null;

  return new Promise((rs, rj) => {
    var request = apiRequest
    .patch(this, {
      url: `${Endpoints.GUILDS}/${guildId}`,
      body: {
        name: name,
        icon: icon,
        region: region,
        afk_channel_id: afkChannelId,
        afk_timeout: afkTimeout,
        verification_level: verificationLevel
      }
    });

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._guilds.update(res.body);
      rs(res.body);
    });
  });
};

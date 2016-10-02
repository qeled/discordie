"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(guildId, type, name, permissionOverwrites,
                          bitrate, userLimit) {
  return new Promise((rs, rj) => {
    const body = {
      type: type,
      name: name,
      permission_overwrites: permissionOverwrites
    };

    if (bitrate != null) body.bitrate = bitrate;
    if (userLimit != null) body.user_limit = userLimit;

    var request = apiRequest
    .post(this,{
      url: Endpoints.GUILD_CHANNELS(guildId),
      body
    });

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._channels.update(res.body);
      rs(res.body);
    });
  });
};

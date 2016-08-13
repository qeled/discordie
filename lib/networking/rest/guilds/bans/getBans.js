"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .get(this, Endpoints.GUILD_BANS(guildId));

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      this.Dispatcher.emit(Events.LOADED_GUILD_BANS, res.body);
      rs(res.body);
    });
  });
};

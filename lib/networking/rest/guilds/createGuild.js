"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(name, region, icon) {
  icon = icon || null;

  return new Promise((rs, rj) => {
    var request = apiRequest
    .post(this, {
      url: Endpoints.GUILDS,
      body: {
        name: name,
        region: region,
        icon: icon
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

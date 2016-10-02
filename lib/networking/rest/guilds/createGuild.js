"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(name, region, icon,
                          roles, channels,
                          verificationLevel, defaultMessageNotifications) {
  icon = icon || null;

  const body = {
    name: name,
    region: region,
    icon: icon
  };

  if (roles != null) body.roles = roles;
  if (channels != null) body.channels = channels;
  if (verificationLevel != null) body.verification_level = verificationLevel;
  if (defaultMessageNotifications != null) {
    body.default_message_notifications = defaultMessageNotifications;
  }

  return new Promise((rs, rj) => {
    var request = apiRequest
    .post(this, {
      url: Endpoints.GUILDS,
      body
    });

    this._queueManager.put(request, (err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._guilds.update(res.body);
      rs(res.body);
    });
  });
};

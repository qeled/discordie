"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(guildId, userId, action_type, before, limit) {
  return new Promise((rs, rj) => {
    var request = apiRequest
    .get(this, {
      url: Endpoints.GUILD_AUDIT_LOGS(guildId),
      query: {
        user_id: userId || undefined,
        action_type: action_type || undefined,
        before: before || undefined,
        limit: limit
      }
    });

    this._queueManager.put(request, (err, res) => {
      var entries = res.body.audit_log_entries;

      var reverseMap = {};
      for(var propName in Constants.ActionTypes) {
          var num = Constants.ActionTypes[propName];
          reverseMap[num] = propName;
      }

      for (var prop in entries) {
        entries[prop].action_type = {
          value: entries[prop].action_type,
          name: reverseMap[entries[prop].action_type]
        };
      }

      return (!err && res.ok) ? rs(entries) : rj(err);
    });
  });
};

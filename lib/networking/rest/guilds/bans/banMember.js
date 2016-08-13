"use strict";

const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId, userId, deleteMessageForDays) {
  deleteMessageForDays = deleteMessageForDays || 0;
  if (deleteMessageForDays && [1, 7].indexOf(deleteMessageForDays) < 0) {
    return Promise.reject(
      new Error("deleteMessageForDays can only be 0, 1 or 7")
    );
  }

  return new Promise((rs, rj) => {
    var request = apiRequest
    .put(this, {
      url: `${Endpoints.GUILD_BANS(guildId)}/${userId}`,
      query: { "delete-message-days": deleteMessageForDays }
    });

    this._queueManager.put(request, (err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

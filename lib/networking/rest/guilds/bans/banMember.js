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
  const deleteHistoryDays = `?delete-message-days=${deleteMessageForDays}`;

  return new Promise((rs, rj) => {
    apiRequest
    .put(this, `${Endpoints.GUILD_BANS(guildId)}/${userId}${deleteHistoryDays}`)
    .send((err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

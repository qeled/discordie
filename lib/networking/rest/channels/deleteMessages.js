"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(channelId, messages) {
  console.log("deletes", messages)
  return new Promise((rs, rj) => {
    apiRequest
    .post(this, {
      url: `${Endpoints.MESSAGES(channelId)}/bulk_delete`,
      body: {messages: messages}
    })
    .send((err, res) => {
      return (!err && res.ok) ? rs() : rj(err);
    });
  });
};

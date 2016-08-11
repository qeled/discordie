"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(currentPassword, username, avatar, email, newPassword) {
  return new Promise((rs, rj) => {
    apiRequest
    .patch(this, {
      url: Endpoints.ME,
      body: {
        username: username,
        email: email,
        password: currentPassword,
        avatar: avatar,
        new_password: newPassword
      }
    })
    .send((err, res) => {
      if (err || !res.ok)
        return rj(err);

      if (res.body && typeof res.body.token === "string") {
        this.token = res.body.token.replace(/^Bot /, "");
      }
      this._users.updateAuthenticatedUser(res.body);
      rs();
    });
  });
};

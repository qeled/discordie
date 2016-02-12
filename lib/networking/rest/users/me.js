"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(currentPassword, username, avatar, email, newPassword) {
  return new Promise((rs, rj) => {
    apiRequest
    .patch(Endpoints.ME)
    .auth(this.token)
    .send({
      username: username,
      email: email,
      password: currentPassword,
      avatar: avatar,
      new_password: newPassword
    })
    .end((err, res) => {
      if (err || !res.ok)
        return rj(err);

      if (res.body.token) this.token = res.body.token;
      this._users.updateAuthenticatedUser(res.body);
      rs();
    });
  });
}

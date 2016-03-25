"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(auth) {
  return new Promise((rs, rj) => {
    apiRequest
    .post(this, {
      url: Endpoints.LOGIN,
      body: auth
    })
    .send((err, res) => {
      if (err || !res.ok) {
        this.Dispatcher.emit(
          Events.REQUEST_AUTH_LOGIN_ERROR,
          {error: err}
        );
        return rj(err);
      }
      this.Dispatcher.emit(
        Events.REQUEST_AUTH_LOGIN_SUCCESS,
        {token: res.body.token, password: auth.password}
      );
      rs();
    });
  });
};

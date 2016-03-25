"use strict";

const Constants = require("../../Constants");
const Events = Constants.Events;
const apiRequest = require("../../core/ApiRequest");

module.exports = function(auth) {
  return new Promise((rs, rj) => {
    apiRequest
    .get(this, "/gateway")
    .send((err, res) => {
      if (err || !res.ok) {
        this.Dispatcher.emit(Events.REQUEST_GATEWAY_ERROR, {error: err});
        return rj(err);
      }
      const event = {gateway: res.body.url};
      this.Dispatcher.emit(Events.REQUEST_GATEWAY_SUCCESS, event);
      rs(event);
    });
  });
}

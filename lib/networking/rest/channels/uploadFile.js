"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

// must specify 'filename' with image extension for image embeds
// if passing a Buffer or Stream into 'readStream'
module.exports = function(channelId, readStream, filename,
                          content, mentions, tts) {
  return new Promise((rs, rj) => {
    apiRequest
    .post(this, {
      url: Endpoints.MESSAGES(channelId),
      attachDelegate: req => {
        req
        .attach("file", readStream, filename)
        .field("content", content || "")
        .field("tts", JSON.stringify(!!tts));
      }
    })
    .send((err, res) => {
      if (err || !res.ok)
        return rj(err);

      this._messages.update(res.body);
      rs(res.body);
    });
  });
};

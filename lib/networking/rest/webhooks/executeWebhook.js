"use strict";

const fs = require("fs");
const path = require("path");

const Utils = require("../../../core/Utils");
const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

function validateFile(file) {
  if (typeof file !== "string") return;
  file = path.resolve(file);
  var stat = fs.statSync(file);
  if (!stat.isFile())
    throw new Error("executeWebhook: path does not point to a file: " + file);
}

module.exports = function(webhookId, token, options, wait) {
  return new Promise((rs, rj) => {
    validateFile(options.file);

    const body = {
      content: options.content || undefined,
      embeds: options.embeds || undefined,
      username: options.username || undefined,
      avatar_url: options.avatarURL || options.avatar_url || undefined,
      tts: options.tts || false
    };

    Utils.cacheStream(options.file, uploadData => {
      var request = apiRequest
      .post(this, {
        url: `${Endpoints.WEBHOOK(webhookId)}/${token}`,
        query: wait != null ? {wait: !!wait} : {},
        body,
        attachDelegate: req => {
          if (!uploadData) return;
          if (!options.filename && uploadData !== "string") {
            options.filename = "unknown.png";
          }

          req.attach("file", uploadData, options.filename);
          if (body.content) req.field("content", body.content);
          if (body.username) req.field("username", body.username);
          if (body.avatar_url) req.field("avatar_url", body.avatar_url);
          req.field("tts", JSON.stringify(!!body.tts));
        }
      });

      const route = Endpoints.WEBHOOK(webhookId);
      this._queueManager.putToRoute(request, route, (err, res) => {
        return (!err && res.ok) ? rs(res.body) : rj(err);
      });
    });
  });
};

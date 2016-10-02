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
    throw new Error("uploadFile: path does not point to a file: " + file);
}

// must specify 'filename' with image extension for image embeds
// if passing a Buffer or Stream into 'readStream'
module.exports = function(channelId, readStream, filename,
                          content, mentions, tts) {
  return new Promise((rs, rj) => {
    validateFile(readStream);

    Utils.cacheStream(readStream, uploadData => {
      var request = apiRequest
      .post(this, {
        url: Endpoints.MESSAGES(channelId),
        attachDelegate: req => {
          if (!filename && uploadData !== "string") {
            filename = "unknown.png";
          }

          req
          .attach("file", uploadData, filename)
          .field("content", content || "")
          .field("tts", JSON.stringify(!!tts));
        }
      });

      this._queueManager.putMessage(request, channelId, (err, res) => {
        if (err || !res.ok)
          return rj(err);

        this._messages.create(res.body);
        rs(res.body);
      });
    });
  });
};

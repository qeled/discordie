"use strict";

const fs = require("fs");
const path = require("path");

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

const Stream = require("stream").Stream;
const Writable = require("stream").Writable;
class CachingSink extends Writable {
  constructor() {
    super();
    this.buffer = [];
  }
  _write(chunk, encoding, done) {
    this.buffer.push(chunk);
    done();
  }
  getData() { return Buffer.concat(this.buffer); }
}

function cacheStream(stream, cb) {
  if (stream instanceof Stream &&
      typeof stream._read === "function" &&
      typeof stream.pipe === "function") {
    const sink = new CachingSink();
    sink.on("finish", () => cb(sink.getData()));
    stream.pipe(sink);
    return;
  }
  cb(stream);
}

// must specify 'filename' with image extension for image embeds
// if passing a Buffer or Stream into 'readStream'
module.exports = function(channelId, readStream, filename,
                          content, mentions, tts) {
  return new Promise((rs, rj) => {
    if (typeof readStream === "string") {
      var file = path.resolve(readStream);
      var stat = fs.statSync(file);
      if (!stat.isFile())
        throw new Error("uploadFile: path does not point to a file: " + file);
    }

    cacheStream(readStream, uploadData => {
      var request = apiRequest
        .post(this, {
          url: Endpoints.MESSAGES(channelId),
          attachDelegate: req => {
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

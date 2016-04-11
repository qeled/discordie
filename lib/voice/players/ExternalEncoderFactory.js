"use strict";

const FFmpegEncoder = require("./FFmpegEncoder");
const OggOpusPlayer = require("./OggOpusPlayer");
const WebmOpusPlayer = require("./WebmOpusPlayer");

module.exports = {
  create(voiceConnection, options) {
    options = options || {};
    const type = options.type || "ffmpeg";

    if (type === "ffmpeg" || type === "avconv") {
      return new FFmpegEncoder(voiceConnection, options);
    }

    if (type.toLowerCase() === "OggOpusPlayer".toLowerCase()) {
      return new OggOpusPlayer(voiceConnection, options);
    }
    if (type.toLowerCase() === "WebmOpusPlayer".toLowerCase()) {
      return new WebmOpusPlayer(voiceConnection, options);
    }

    throw new Error(`Invalid type '${options.type}'`);
  }
};
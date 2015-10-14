"use strict";

const Constants = require("../../../Constants");
const VoiceUDP = require("../../voicetransports/VoiceUDP");

module.exports = function handler(data, voicews) {
  voicews.connectAudioTransport(data.ssrc, data.port, data.modes);
  return true;
};

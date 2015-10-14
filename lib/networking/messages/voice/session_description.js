"use strict";

module.exports = function handler(data, voicews) {
  voicews.speaking(true, 0);
  return true;
};

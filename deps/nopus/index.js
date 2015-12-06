var ex = "uncaughtException";
var pl = process.listeners(ex);

var opus = require("./opus-js/opus");
var resampler = require("./opus-js/resampler");

process.removeAllListeners(ex);
for (var i = 0; i < pl.length; i++) process.on(ex, pl[i]);

module.exports.Opus = opus.Opus;
module.exports.OpusApplication = opus.OpusApplication;
module.exports.OpusEncoder = opus.OpusEncoder;
module.exports.OpusDecoder = opus.OpusDecoder;
module.exports.Resampler = resampler.SpeexResampler;

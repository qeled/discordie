var opus = require("./opus-js/opus");
var resampler = require("./opus-js/resampler");

module.exports.Opus = opus.Opus;
module.exports.OpusApplication = opus.OpusApplication;
module.exports.OpusEncoder = opus.OpusEncoder;
module.exports.OpusDecoder = opus.OpusDecoder;
module.exports.Resampler = resampler.SpeexResampler;

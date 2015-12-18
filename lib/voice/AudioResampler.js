"use strict";

function interpLinear(i, i0, v0, v1) {
  var d = i - i0;
  return v0 * (1 - d) + v1 * d;
}

function interpNearest(i, i0, v0, v1) {
  return (i - i0) < 0.5 ? v0 : v1;
}

class AudioResampler {
  constructor(channels, sourceRate, targetRate, interpolation) {
    if (channels <= 0) throw new TypeError("Invalid channel count");

    this.channels = channels;
    this.sourceRate = sourceRate;
    this.targetRate = targetRate;
    this.interpolation = interpolation || "linear";

    const interp = {
      linear: interpLinear,
      nearest: interpNearest,
    };

    if (!interp[this.interpolation])
      throw new Error("Unknown interpolation type");

    this.interp = interp[this.interpolation];
  }
  process(buffer) {
    var ratio = this.sourceRate / this.targetRate;
    var resampled = new Float32Array(buffer.length / ratio);
    var bufferLength = buffer.length;

    var interp = this.interp;

    var channels = this.channels;
    if (channels == 1) {
      for (var i = 0, r = 0; i < bufferLength; i += ratio) {
        var i0 = Math.floor(i);
        var i1 = i0 + 1;
        while (i1 >= buffer.length) i1--;
        resampled[r++] = interp(i, i0, buffer[i0], buffer[i1]);
      }
    } else {
      var channelLength = bufferLength / channels;
      for (var c = 0; c < channels; c++) {
        for (var i = 0, r = 0; i < channelLength; i += ratio) {
          var ifl = Math.floor(i);
          var i0 = ifl * channels + c;
          var i1 = i0 + channels;
          while (i0 >= buffer.length) i0 -= channels;
          while (i1 >= buffer.length) i1 -= channels;
          resampled[r++ * channels + c] =
            interp(i, ifl, buffer[i0], buffer[i1]);
        }
      }
    }

    return resampled;
  }
  destroy() {}
}

module.exports = AudioResampler;
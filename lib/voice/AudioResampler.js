"use strict";

function interpLinear(buffer, i) {
  var i0 = Math.floor(i);
  var i1 = i0 + 1;
  if (i1 >= buffer.length) i1 = 0;
  var v = i - i0;
  return buffer[i0] * (1 - v) + buffer[i1] * v;
}

function interpNearest(buffer, i) {
  return i >= buffer.length - 0.5 ? buffer[0] : buffer[Math.round(i)];
}

class AudioResampler {
  constructor(sourceRate, targetRate, interpolation) {
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

    var i = 0;
    var r = 0;
    for (; i < bufferLength; i += ratio)
      resampled[r++] = interp(buffer, i);

    return resampled;
  }
  destroy() {}
}

module.exports = AudioResampler;
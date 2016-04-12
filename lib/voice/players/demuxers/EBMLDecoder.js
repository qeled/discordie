"use strict";

const ebml = require('ebml');
ebml.Decoder.prototype.__transform = ebml.Decoder.prototype._transform;
ebml.Decoder.prototype._transform = function(chunk, encoding, done) {
  // catch "Unrepresentable length" errors
  try {
    this.__transform.apply(this, arguments);
  } catch (e) {
    this.push(null);
    done();
  }
};

module.exports = ebml.Decoder;
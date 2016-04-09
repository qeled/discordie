"use strict";

class Bucket {
  constructor(size, duration) {
    this.size = size;
    this.duration = duration;

    this.refill();
  }
  refill() {
    this.lastRefill = (Date.now() / 1000);
    this.dropsLeft = this.size;
  }
  get available() {
    var now = (Date.now() / 1000);
    if ((this.lastRefill + this.duration) < now)
      this.refill();
    return this.dropsLeft;
  }
  consume(n) {
    if (!n) n = 1;
    if (this.available < n)
      return false;

    this.dropsLeft -= n;
    return true;
  }
}

module.exports = Bucket;
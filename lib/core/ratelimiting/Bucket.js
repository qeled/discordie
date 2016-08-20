"use strict";

const Profiler = require("../DiscordieProfiler");

class Bucket {
  constructor(size, duration) {
    this.size = size;
    this.duration = duration;

    if (typeof size !== "number")
      throw new TypeError("Param 'size' is not a number");
    if (typeof duration !== "number")
      throw new TypeError("Param 'duration' is not a number");

    this.refill();
  }
  resize(newSize) {
    if (newSize > 0) {
      if (this.size === this.dropsLeft) this.dropsLeft = newSize;
      if ((this.size - 1) === this.dropsLeft) this.dropsLeft = newSize - 1;
    }
    this.size = newSize;
  }
  rescheduleRefill(timeFromNow) {
    this.lastRefill = (Profiler.hrtime() - this.duration) + timeFromNow;
  }
  wait(time) {
    this.rescheduleRefill(time);
    this.dropsLeft = 0;
  }
  refill() {
    this.lastRefill = Profiler.hrtime();
    this.dropsLeft = this.size;
  }
  get waitTime() {
    var now = Profiler.hrtime();
    return (this.lastRefill + this.duration) - now;
  }
  get available() {
    if (this.waitTime < 0)
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
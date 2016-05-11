"use strict";

class Backoff {
  constructor(min, max, jitter) {
    this._min = (min != null && min > 0) ? min : 500;
    this._max = (max != null && max > this._min) ? max : (this._min * 30);
    this.jitter = (jitter != null) ? jitter : true;

    this.fails = 0;
    this.delay = this._min;

    this._timer = null;
  }

  get min() { return this._min; }
  set min(value) {
    if (value < 0) throw new TypeError("Param 'value' must be >= 0");
    this._min = value;
    if (!this.fails) this.delay = this._min;
  }

  get max() { return this._max; }
  set max(value) {
    if (value < 5000) throw new TypeError("Param 'value' must be >= 5000");
    this._max = value;
  }

  reset() {
    this.cancel();
    this.fails = 0;
    this.delay = this._min;
  }
  fail(cb) {
    this.fails++;
    const delay = this.delay * 2 * (this.jitter ? Math.random() : 1);
    this.delay = Math.min(this.delay + delay, this._max);

    if (typeof cb !== "function") return this.delay;

    this.cancel();
    this._timer = setTimeout(() => {
      try { cb(); }
      catch (e) { console.log(e instanceof Error ? e.stack : e); }
      finally { this._timer = null; }
    }, this.delay);

    return this.delay;
  }
  cancel() {
    if (!this._timer) return;
    clearTimeout(this._timer);
    this._timer = null;
  }
}

module.exports = Backoff;

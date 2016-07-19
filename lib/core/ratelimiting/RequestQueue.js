"use strict";

const Deque = require("double-ended-queue");

const DEFAULT_RETRY_AFTER = 100;

const PREEMPTIVE_RATELIMIT_DELAY = 200;

class RequestQueue {
  constructor(bucket) {
    this.bucket = bucket || null;

    this.queue = new Deque();
    this.timeout = null;
    this.draining = false;

    this.disabled = false;
  }
  enqueue(request, sendCallback) {
    this.queue.push({request, sendCallback});
    this._drain();
  }
  _drain() {
    if (this.disabled) {
      const entry = this.queue.shift();
      entry.request.send(entry.sendCallback);
      if (this.queue.length) {
        setImmediate(() => this._drain());
      }
      return;
    }

    if (!this.queue.length) return;
    if (this.timeout !== null || this.draining) return;

    if (this.bucket && !this.bucket.consume()) {
      this._scheduleDrain(this.bucket.waitTime + PREEMPTIVE_RATELIMIT_DELAY);
      return;
    }

    this.draining = true;
    const entry = this.queue.shift();

    entry.request.send((err, res) => {
      this.draining = false;

      if (err && res && res.status === 429) {
        this.queue.unshift(entry);

        const retryAfter =
          res.body["retry_after"] ||
          res.headers["retry-after"] ||
          DEFAULT_RETRY_AFTER;

        this._scheduleDrain(retryAfter);
        return;
      }

      setImmediate(() => this._drain());
      if (typeof entry.sendCallback === "function") {
        entry.sendCallback(err, res);
      }
    });
  }
  _scheduleDrain(time) {
    this.timeout = setTimeout(() => {
      this.timeout = null;
      this._drain();
    }, time);
  }
}

module.exports = RequestQueue;
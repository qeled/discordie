"use strict";

const Deque = require("double-ended-queue");

const DEFAULT_RETRY_AFTER = 100;

class RequestQueue {
  constructor() {
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

        this.timeout = setTimeout(() => {
          this.timeout = null;
          this._drain();
        }, retryAfter);
        return;
      }

      setImmediate(() => this._drain());
      if (typeof entry.sendCallback === "function") {
        entry.sendCallback(err, res);
      }
    });
  }
}

module.exports = RequestQueue;
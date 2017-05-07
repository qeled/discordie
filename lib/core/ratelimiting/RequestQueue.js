"use strict";

const Profiler = require("../DiscordieProfiler");
const Deque = require("double-ended-queue");

const DEFAULT_RETRY_AFTER = 100;

const DEFAULT_DRAIN_DELAY = 1000;

const latency = {
  responses: [],
  min: 0,
  max: 0,
  jitter: 0,
  drainDelay: DEFAULT_DRAIN_DELAY,
};

function updateResponseLatency(responseTime) {
  if (latency.responses.length >= 10) {
    latency.responses.shift();
  }
  latency.responses.push(responseTime);

  const responses = latency.responses;

  latency.max = responses.reduce((c, n) => Math.max(c, n), -Infinity);
  latency.min = responses.reduce((c, n) => Math.min(c, n), Infinity);
  latency.jitter = latency.max - latency.min;
  latency.drainDelay = Math.min(1000, latency.jitter) || DEFAULT_DRAIN_DELAY;
}

class RequestQueue {
  constructor(bucket) {
    this.bucket = bucket || null;

    this.queue = new Deque();
    this.timeout = null;
    this.draining = false;

    this.lastReset = 0;

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
      this._scheduleDrain(this.bucket.waitTime);
      return;
    }

    this.draining = true;
    const entry = this.queue.shift();

    const requestStart = Profiler.hrtime();

    entry.request.send((err, res) => {
      this.draining = false;

      this._updateBucket(res);

      updateResponseLatency(Profiler.hrtime() - requestStart);

      if (err && res && res.status === 429) {
        this.queue.unshift(entry);

        const retryAfter =
          res.body["retry_after"] ||
          (+res.headers["retry-after"]) ||
          DEFAULT_RETRY_AFTER;

        const isGlobal =
          res.body["global"] ||
          (res.headers["x-ratelimit-global"] === "true") ||
          false;

        if (isGlobal) {
          const manager = entry.request._discordie._queueManager;
          if (manager && manager.globalBucket) {
            manager.globalBucket.wait(retryAfter);
          }
        } else if (this.bucket) {
          this.bucket.wait(retryAfter);
        }

        this._scheduleDrain(retryAfter);
        return;
      }

      setImmediate(() => this._drain());
      if (typeof entry.sendCallback === "function") {
        entry.sendCallback(err, res);
      }
    });
  }
  _updateBucket(res) {
    if (!res || !res.headers) return;
    if (!this.bucket) return;

    // update limits and timing based on server info if available,
    // otherwise fallback to hardcoded buckets

    const belowPrecision = this.bucket.duration < 1000; // reactions case

    if (res.headers["x-ratelimit-limit"]) {
      const limit = +res.headers["x-ratelimit-limit"];
      if (!belowPrecision && limit > 1) this.bucket.resize(limit);
    }

    if (res.headers["x-ratelimit-remaining"]) {
      const remaining = +res.headers["x-ratelimit-remaining"];
      if (!isNaN(remaining)) this.bucket.dropsLeft = remaining;
    }

    if (res.headers["x-ratelimit-reset"] && res.headers["date"]) {
      const resetSeconds = (+res.headers["x-ratelimit-reset"]) || 0;
      if (!belowPrecision && resetSeconds > 0) {
        const date = new Date(res.headers["date"]).getTime();
        const reset = new Date(resetSeconds * 1000).getTime();
        const now = date > 0 ? date : Date.now();

        if (!this.lastReset || reset > this.lastReset) {
          this.lastReset = reset;
          this.bucket.rescheduleRefill(reset - now);
        }
      }
    }
  }
  _scheduleDrain(time) {
    this.timeout = setTimeout(() => {
      this.timeout = null;
      this._drain();
    }, time + latency.drainDelay);
  }
}

module.exports = RequestQueue;
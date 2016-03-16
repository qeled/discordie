"use strict";

const state = new Map();
const stats = new Map();

class DiscordieProfiler {
  static hrtime() {
    const t = process.hrtime();
    return t[0] * 1000 + t[1] / 1000000;
  }
  static start(n) {
    state.set(n, this.hrtime());
  }
  static stop(n) {
    const d = this.hrtime() - state.get(n);
    stats.set(n, d);
    return d;
  }
  static get(n) {
    return stats.get(n);
  }
}

module.exports = DiscordieProfiler;

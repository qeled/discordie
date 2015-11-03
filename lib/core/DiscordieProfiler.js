"use strict";

const state = new Map();
const stats = new Map();

function hrtime() {
  const t = process.hrtime();
  return t[0] * 1000 + t[1] / 1000000;
}

class DiscordieProfiler {
  static start(n) {
    state.set(n, hrtime());
  }
  static stop(n) {
    const d = hrtime() - state.get(n);
    stats.set(n, d);
    return d;
  }
  static get(n) {
    return stats.get(n);
  }
}

module.exports = DiscordieProfiler;

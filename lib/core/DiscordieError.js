"use strict";

class DiscordieError extends Error {
  constructor(message, exception) {
    super(message);
    if (exception) this.exception = exception;
  }
  toJSON() {
    return this.message;
  }
}

module.exports = DiscordieError;

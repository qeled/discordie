"use strict";

class DiscordieError extends Error {
  constructor(message, exception) {
    super(message);
    this.exception = exception;
  }
}

module.exports = DiscordieError;

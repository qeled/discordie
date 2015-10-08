"use strict";

class DiscordieError {
	constructor(message, exception) {
		this.message = message;
		this.exception = exception;
	}
}

module.exports = DiscordieError;

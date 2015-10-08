"use strict";

const superagent = require("superagent");
const Constants = require("../Constants");

const originalRequest = superagent.Request.prototype.request;
superagent.Request.prototype.request = function() {
	this.url = Constants.API_ENDPOINT + this.url;
	return originalRequest.apply(this, arguments);
}

const originalEnd = superagent.Request.prototype.end;
superagent.Request.prototype.end = function() {
	this.set("User-Agent", "Discordie");
	return originalEnd.apply(this, arguments);
};

superagent.Request.prototype.auth = function(token) {
	return this.set("Authorization", token);
};

module.exports = superagent;

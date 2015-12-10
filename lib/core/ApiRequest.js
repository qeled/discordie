"use strict";

const superagent = require("superagent");
const Constants = require("../Constants");

const os = require("os");
const version = require('../../package.json').version;
const useragent = [
  "DiscordBot",
  `(https://github.com/qeled/discordie, v${version})`,
  `(${os.type()} ${os.release()}; ${os.arch()})`,
  process.version.replace(/^v/, (process.release.name || "node") + "/"),
  process.versions.openssl ? `openssl/${process.versions.openssl}` : null,
].filter(e => e).join(" ");

function isDiscordAPI(url) {
  if (!url.startsWith("/")) return false;
  for (const k in Constants.Endpoints) {
    if (url.startsWith(Constants.Endpoints[k]))
      return true;
  }
  return false;
}

const originalRequest = superagent.Request.prototype.request;
superagent.Request.prototype.request = function() {
  if (isDiscordAPI(this.url))
    this.url = Constants.API_ENDPOINT + this.url;
  return originalRequest.apply(this, arguments);
};

const originalEnd = superagent.Request.prototype.end;
superagent.Request.prototype.end = function() {
  if (isDiscordAPI(this.url))
    this.set("User-Agent", useragent);
  return originalEnd.apply(this, arguments);
};

superagent.Request.prototype.auth = function(token) {
  return this.set("Authorization", token);
};

module.exports = superagent;

"use strict";

const superagent = require("superagent");
const Constants = require("../Constants");
const Backoff = require("./Backoff");

const os = require("os");
const version = require('../../package.json').version;

const useragent = process.browser ? "" : [
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

const BAD_GATEWAY_MIN_DELAY_MS = 100;
const BAD_GATEWAY_MAX_RETRIES = 10;

const HTTP_BAD_GATEWAY = 502;

class ApiRequest {
  constructor(method, discordie, options) {
    this._discordie = discordie;

    options = options || {};
    if (typeof options === "string") {
      options = {url: options};
    }
    options.method = method;

    if (!options.url) {
      throw new TypeError(`ApiRequest ${method} failed: Invalid URL`);
    }

    this._badGatewayBackoff = new Backoff(
      BAD_GATEWAY_MIN_DELAY_MS,
      BAD_GATEWAY_MIN_DELAY_MS * 100
    );
    this._badGatewayRetries = 0;

    this._options = options;
    this._request = null;

    this._promise = null;
    this._resolve = null;
    this._reject = null;

    this._callback = null;
  }
  get method() {
    return this._options.method;
  }
  get path() {
    return this._options.url;
  }
  send(callback) {
    if (this._promise) {
      if (callback) {
        console.warn(
          "Called ApiRequest.send with callback more than 1 time: "
          + this._options.url
        );
      }
      return this._promise;
    }

    this._callback = callback || null;

    this._promise = new Promise((rs, rj) => {
      this._resolve = rs;
      this._reject = rj;

      this._send();
    });

    // no need to fire unhandled rejection for this one if using callback
    if (callback) {
      this._promise.catch(this._void);
    }

    return this._promise;
  }
  _void() {}
  _safeCallback(err, res) {
    if (typeof this._callback !== "function") return;
    this._callback(err, res);
    this._callback = null;
  }
  _send() {
    const token = this._discordie.token;
    const method = this._options.method;
    const query = this._options.query;
    const body = this._options.body;
    const attachDelegate = this._options.attachDelegate;
    const rs = this._resolve, rj = this._reject;

    var req = superagent[method](Constants.API_ENDPOINT + this._options.url);
    this._request = req;

    const botPrefix = this._discordie.bot ? "Bot " : "";

    if (useragent) req.set("User-Agent", useragent);
    if (token) req.set("Authorization", botPrefix + token);
    if (query) req.query(query);
    if (body) req.send(body);

    if (typeof attachDelegate === "function") attachDelegate(req);
    // warning: don't call requests with attachDelegate more than once because
    //          it can attach form data with streams

    req.end((err, res) => {
      this._request = null;

      if (res && !res.ok && res.status === HTTP_BAD_GATEWAY) {
        this._badGatewayRetries++;
        if (this._badGatewayRetries <= BAD_GATEWAY_MAX_RETRIES) {
          return this._badGatewayBackoff.fail(() => this._send());
        }
      }

      if (err || !res.ok) {
        if (res && res.body && res.body.code && res.body.message) {
          err.code = res.body.code;
          err.message = err.message + ` (${res.body.message})`;
        }
        rj(err);
      } else {
        rs(res);
      }

      this._promise = null;
      this._safeCallback(err, res);
    });

    req.on("abort", () => {
      this._request = null;
      rj("Cancelled");
    });
  }
  cancel() {
    if (!this._request) return;
    this._request.abort();
  }
}

function createRequest(_method, discordie, options) {
  return new ApiRequest(_method, discordie, options);
}

module.exports = {
  get: createRequest.bind(null, "get"),
  post: createRequest.bind(null, "post"),
  patch: createRequest.bind(null, "patch"),
  put: createRequest.bind(null, "put"),
  del: createRequest.bind(null, "del"),
  delete: createRequest.bind(null, "del")
};

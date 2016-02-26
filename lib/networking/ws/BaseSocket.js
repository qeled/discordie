"use strict";

const WebSocket = require("ws");
const Constants = require("../../Constants");

const heartbeat = new WeakMap();

class BaseSocket extends WebSocket {
  constructor(url) {
    super(url);
    this.readyState = Constants.ReadyState.CONNECTING;
    this.on("open", () => this.readyState = Constants.ReadyState.OPEN);

    const close = () => {
      this.unsetHeartbeat();
      this.readyState = Constants.ReadyState.CLOSED;
    };
    this.on("close", close);
    this.on("error", close);
  }
  get connected() {
    return this.readyState == Constants.ReadyState.OPEN;
  }
  get connecting() {
    return this.readyState == Constants.ReadyState.CONNECTING;
  }
  send(op, data) {
    let m = {op: op, d: data};

    try {
      super.send(JSON.stringify(m));
    } catch (e) { console.error(e.stack); }
  }
  setHeartbeat(opcode, msec) {
    if (!this.connected)
      return;

    heartbeat.set(this, setInterval(() => {
      if (!this.connected)
        return this.close();
      this.send(opcode, new Date().getTime());
    }, msec));
  }
  unsetHeartbeat() {
    var handle = heartbeat.get(this);
    if (handle !== undefined) clearInterval(handle);
    heartbeat.delete(this);
  }
  close() {
    super.close();
    this.unsetHeartbeat();

    // wait close frame for 5 seconds instead of default 30
    if (this._closeTimer && this._closeTimer._onTimeout) {
      var callback = this._closeTimer._onTimeout;
      setTimeout(() => callback(), 5000);
    }
    clearTimeout(this._closeTimer);
  }
}

module.exports = BaseSocket;

"use strict";

const EventEmitter = require("events").EventEmitter;

class BrowserWebSocket extends EventEmitter {
  constructor(url) {
    super();
    const ws = this._websocket = new WebSocket(url);

    ws.binaryType = "arraybuffer";

    ws.onopen = e => this.emit("open");
    ws.onmessage = e => this.emit("message", e.data);
    ws.onclose = e => this.emit("close", e.code, e.reason);
  }
  send(data) {
    this._websocket.send.apply(this._websocket, arguments);
  }
  close(code, reason) {
    this._websocket.close.apply(this._websocket, arguments);
  }
}

BrowserWebSocket.available = !!global.WebSocket;

module.exports = BrowserWebSocket;
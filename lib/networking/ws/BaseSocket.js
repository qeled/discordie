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
			heartbeat.delete(this);
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
		var m = {op: op, d: data};

		try {
			super.send(JSON.stringify(m));
		} catch(e) { console.log(e.stack); }
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
}

module.exports = BaseSocket;

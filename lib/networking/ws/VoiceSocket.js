"use strict";

const BaseSocket = require("./BaseSocket");
const Constants = require("../../Constants");
const Events = Constants.Events;
const AudioScheduler = require("../../voice/AudioScheduler");

const OPCODE_IDENTIFY = 0;
const OPCODE_SELECT_PROTOCOL = 1;
const OPCODE_READY = 2;
const OPCODE_HEARTBEAT = 3;
const OPCODE_SESSION_DESCRIPTION = 4;
const OPCODE_SPEAKING = 5;

const gateway = new WeakMap();

class VoiceSocket {
	constructor(_gateway) {
		gateway.set(this, _gateway);
		this.Dispatcher = _gateway.Dispatcher;
		this.socket = null;
		this.audioTransportSocket = null;
	}
	getGateway() {
		return gateway.get(this, _gateway);
	}
	get connected() {
		return this.socket && this.socket.connected;
	}
	get connecting() {
		return this.socket && this.socket.connecting;
	}
	get transport() {
		if (this.audioTransportSocket) {
			if (this.audioTransportSocket.constructor.name == "VoiceUDP")
				return "udp";
		}
		return "none";
	}
	connect(server, serverId, userId, sessionId, voiceToken) {
		if (this.connected)
			this.disconnect();

		this.voiceServer = server;
		this.voiceServerURL = "wss://" + server;
		this.socket = new BaseSocket(this.voiceServerURL);
		this.socket.on("open", e => {
			this.Dispatcher.emit(Events.VOICESOCKET_OPEN, {socket: this});

			this.identify(serverId, userId, sessionId, voiceToken);
		});
		this.socket.on("message", e => {
			var msg = JSON.parse(e);
			var op = msg.op;
			var data = msg.d;

			if (op === OPCODE_READY) {
				if (data.heartbeat_interval > 0) {
					this.socket.setHeartbeat(
						OPCODE_HEARTBEAT,
						data.heartbeat_interval
					);
				}

				this.audioScheduler = new AudioScheduler(this);

				this.Dispatcher.emit(
					Events.VOICE_READY,
					{socket: this, data: data}
				);
				return;
			}

			if (op === OPCODE_SESSION_DESCRIPTION) {
				if (data.secret_key && data.secret_key.length > 0) {
					var buffer = new ArrayBuffer(data.secret_key.length);
					this.secret = new Uint8Array(buffer);
					for (var i = 0; i < this.secret.length; i++) {
						this.secret[i] = data.secret_key[i];
					}
				}

				this.Dispatcher.emit(
					Events.VOICE_SESSION_DESCRIPTION,
					{socket: this, data: data}
					//data.secret_key, data.mode
				);

				this.Dispatcher.emit(
					Events.VOICE_CONNECTED,
					{socket: this}
				);
			}

			if(op === OPCODE_SPEAKING) {
				this.Dispatcher.emit(
					Events.VOICE_SPEAKING,
					{socket: this, data: data}
					//data.user_id, data.ssrc, data.speaking
				);
			}
		});

		this.socket.on("close", this.disconnect.bind(this));
		this.socket.on("error", this.disconnect.bind(this));
	}
	disconnect(error) {
		if (this.connected) {
			this.socket.close();
			this.socket = null;
		}

		if (this.audioTransportSocket) {
			this.audioTransportSocket.close();
			this.audioTransportSocket = null;
		}

		if(this.audioScheduler) {
			this.audioScheduler.kill();
			this.audioScheduler = null;
		}

		delete this.secret;

		let msg = {socket: this};
		if (error) msg.error = error;
		this.Dispatcher.emit(Events.VOICESOCKET_DISCONNECT, msg);
	}
	identify(serverId, userId, sessionId, token) {
		this.socket.send(OPCODE_IDENTIFY, {
			server_id: serverId,
			user_id: userId,
			session_id: sessionId,
			token: token
		});
	}
	selectProtocol(protocol, data) {
		if (!data) data = null;
		this.socket.send(OPCODE_SELECT_PROTOCOL, {protocol, data});
	}
	speaking(speaking, delay) {
		if (!delay) delay = 0;
		this.socket.send(OPCODE_SPEAKING, {speaking, delay});
	}

	toJSON() { return `[VoiceSocket ${this.voiceServerURL}]`; }
}

module.exports = VoiceSocket;

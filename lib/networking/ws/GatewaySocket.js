"use strict";

const BaseSocket = require("./BaseSocket");
const VoiceSocket = require("./VoiceSocket");
const Constants = require("../../Constants");
const DiscordieError = require("../../core/DiscordieError");
const Events = Constants.Events;

require("../../core/SSLCA");

const OPCODE_DISPATCH = 0;
const OPCODE_HEARTBEAT = 1;
const OPCODE_IDENTIFY = 2;
const OPCODE_STATUS_UPDATE = 3;
const OPCODE_VOICE_STATE_UPDATE = 4;
const OPCODE_VOICE_SERVER_PING = 5;
const OPCODE_RESUME = 6;
const OPCODE_REDIRECT = 7;

const VERSION = 3;

const discordie = new WeakMap();

class GatewaySocket {
	constructor(_discordie) {
		discordie.set(this, _discordie);
		this.Dispatcher = _discordie.Dispatcher;
		this.socket = null;

		this.voiceGuildId = null;
		this.voiceChannelId = null;
		this.voiceSelfMute = false;
		this.voiceSelfDeaf = false;

		this.voiceSocket = null;

		this.userId = null;

		this.sendQueue = [];

		this.resumeTries = 0;
	}
	get connected() {
		return this.socket && this.socket.connected;
	}
	get connecting() {
		return this.socket && this.socket.connecting;
	}
	connect(url) {
		if(this.connected)
			this.disconnect();

		this.gatewayURL = url;
		this.socket = new BaseSocket(url);
		this.socket.on("open", e => {
			this.Dispatcher.emit(Events.GATEWAY_OPEN, {socket: this});

			if (this.seq > 0) {
				this.resumeTries++;
				console.log("trying resume with sess " + this.sessionId + ", seq " + this.seq);
				return this.socket.send(OPCODE_RESUME, {
					session_id: this.sessionId,
					seq: this.seq
				});
			}

			if (!discordie.get(this).token)
				return this.disconnect();

			this.identify(discordie.get(this).token);
		});
		this.socket.on("message", e => {
			var msg = JSON.parse(e);
			var op = msg.op;
			var seq = msg.s;
			var type = msg.t;
			var data = msg.d;

			if (seq) this.seq = seq;

			if (op === OPCODE_REDIRECT) {
				connect(data.url);
			}
			if (op === OPCODE_DISPATCH) {
				if(["READY", "RESUME"].indexOf(type) >= 0) {
					if (type === "READY") {
						this.sessionId = data.session_id;
						this.userId = data.user.id;
					}

					let payload;
					while (payload = this.sendQueue.shift()) {
						this.socket.send(payload);
					}

					if (data.heartbeat_interval > 0) {
						this.socket.setHeartbeat(
							OPCODE_HEARTBEAT,
							data.heartbeat_interval
						);
					}
				}

				this.Dispatcher.emit(
					Events.GATEWAY_DISPATCH,
					{socket: this, type: type, data: data}
				);
			}
			if(op === OPCODE_REDIRECT) {
				// todo: implement redirect
			}
		});

		const close = (error) => {
			this.disconnect();
			this.Dispatcher.emit(Events.GATEWAY_DISCONNECT, {socket: this, error: error});

			// todo: check if we need to handle VOICE_STATE_UPDATE for secondary sockets

			const primary = (this === discordie.get(this).gatewaySocket);
			if(primary) {
				this.Dispatcher.emit(
					Events.DISCONNECTED,
					{error: new DiscordieError("Disconnected from primary gateway", e.error)}
				);
			}
		};
		this.socket.on("close", close);
		this.socket.on("error", close);
	}
	send(op, data) {
		if(!this.connected) {
			this.sendQueue.push(JSON.stringify({op: op, data: data}));
			return;
		}
		this.socket.send(op, data);
	}
	disconnect() {
		this.disconnectVoice();

		if (this.connected)
			this.socket.close();

		this.socket.readyState = Constants.ReadyState.CLOSED;
		if (this.resumeTries > 1) {
			this.seq = 0;
			this.resumeTries = 0;
		}
		this.sendQueue.length = 0;
		this.sendQueue = [];
	}
	identify(token) {
		this.socket.send(OPCODE_IDENTIFY, {
			token: token,
			properties: {
				"$os": "",
				"$browser": "Discordie",
				"$device": ""
			},
			v: VERSION
		});
	}
	statusUpdate(idleSince, gameId) {
		this.send(OPCODE_STATUS_UPDATE, {
			idle_since: idleSince,
			game_id: gameId
		});
	}
	voiceStateUpdate(guildId, channelId, selfMute, selfDeaf) {
		if (!guildId) guildId = null;
		if (!channelId) channelId = null;
		if (!selfMute) selfMute = false;
		if (!selfDeaf) selfDeaf = false;
		this.voiceGuildId = guildId;
		this.voiceChannelId = channelId;
		this.voiceSelfMute = selfMute;
		this.voiceSelfDeaf = selfDeaf;
		this.send(OPCODE_VOICE_STATE_UPDATE, {
			guild_id: guildId,
			channel_id: channelId,
			self_mute: selfMute,
			self_deaf: selfDeaf
		});
	}
	voiceServerPing() {
		// todo: handle voice reconnects, disconnects and other fun stuff
		this.socket.send(OPCODE_VOICE_SERVER_PING, null);
	}

	createVoiceSocket(endpoint, guildId, userId, sessionId, token) {
		this.disconnectVoice();
		if(!endpoint) return;
		this.voiceSocket = new VoiceSocket(this);
		this.voiceSocket.connect(
			endpoint.split(":")[0],
			guildId, userId, sessionId, token
		);
	}
	disconnectVoice() {
		if (this.voiceSocket) {
			if(this.connected)
				this.voiceStateUpdate(null, null);

			this.voiceSocket.disconnect();
			this.voiceSocket = null;
		}
	}
	toJSON() { return `[GatewaySocket ${this.gatewayURL}]`; }
}

module.exports = GatewaySocket;

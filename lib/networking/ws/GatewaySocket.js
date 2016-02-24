"use strict";

const pako = require("pako");
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
const OPCODE_REQUEST_GUILD_MEMBERS = 8;

const ERROR_INVALID_MESSAGE = 4002; // ?
const ERROR_RESUME_DISCONNECTED_SESSION = 4003; // ?
const ERROR_AUTHENTICATION_FAILED = 4004;
const ERROR_RESUME_INVALID_SESSION = 4006; // ?
const ERROR_RATE_LIMITED = 4008;
const IS_DISCORD_ERROR = error => (+error) / 1000 | 0 === 4;

const VERSION = 3;

const discordie = new WeakMap();

class GatewaySocket {
  constructor(_discordie, compressMessages) {
    discordie.set(this, _discordie);
    this.Dispatcher = _discordie.Dispatcher;
    this.socket = null;

    this.compressed = compressMessages;
    Object.defineProperty(this, "compressed", {writable: false});

    this.voiceState = {
      guildId: null,
      channelId: null,
      selfMute: false,
      selfDeaf: false,
    };

    this.voiceSocket = null;
    this.userId = null;
    this.sendQueue = [];
    this.resumeTries = 0;
  }
  get isPrimary() {
    return (this === discordie.get(this).gatewaySocket);
  }
  get connected() {
    return this.socket && this.socket.connected;
  }
  get connecting() {
    return this.socket && this.socket.connecting;
  }
  connect(url) {
    if (this.connected)
      this.disconnect();

    this.gatewayURL = url || this.gatewayURL;
    this.socket = new BaseSocket(this.gatewayURL);
    this.socket.on("open", e => {
      this.Dispatcher.emit(Events.GATEWAY_OPEN, {socket: this});

      if (this.seq > 0) {
        this.resumeTries++;
        return this.socket.send(OPCODE_RESUME, {
          session_id: this.sessionId,
          seq: this.seq
        });
      }

      if (!discordie.get(this).token) {
        this.Dispatcher.emit(
          Events.DISCONNECTED,
          {error: new DiscordieError("No token specified")}
        );
        return this.disconnect();
      }

      this.identify(discordie.get(this).token);
    });
    this.socket.on("message", e => {
      if (this.compressed && e instanceof Buffer) {
        e = pako.inflate(e, {to: "string"});
      }
      const msg = JSON.parse(e);
      const op = msg.op;
      const seq = msg.s;
      const type = msg.t;
      const data = msg.d;

      if (seq && this.sessionId) this.seq = seq;

      if (op === OPCODE_REDIRECT) {
        this.connect(data.url);
      }
      if (op === OPCODE_DISPATCH) {
        if (["READY", "RESUME"].indexOf(type) >= 0) {
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
    });

    const close = (code, desc) => {
      this.disconnect(code, desc, true);

      if (this.isPrimary) {
        this.Dispatcher.emit(
          Events.DISCONNECTED,
          {error: new DiscordieError("Disconnected from primary gateway", code)}
        );
      }
    };
    this.socket.on("close", close);
    this.socket.on("error", close);
  }
  send(op, data) {
    if (!this.connected) {
      this.sendQueue.push(JSON.stringify({op: op, data: data}));
      return;
    }
    this.socket.send(op, data);
  }
  disconnect(error, description, causedByEvent) {
    if (!causedByEvent || IS_DISCORD_ERROR(error)) {
      this.seq = 0;
      delete this.sessionId;
    }

    this.disconnectVoice();

    if (this.connected) {
      this.socket.close();

      let msg = {socket: this};
      if (error) msg.error = error;
      this.Dispatcher.emit(Events.GATEWAY_DISCONNECT, msg);
    }

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
      v: VERSION,
      compress: this.compressed
    });
  }
  statusUpdate(idleSince, game) {
    this.send(OPCODE_STATUS_UPDATE, {
      idle_since: idleSince,
      game: game
    });
  }
  voiceStateUpdate(guildId, channelId, selfMute, selfDeaf) {
    if (!guildId) guildId = null;
    if (!channelId) channelId = null;
    if (!selfMute) selfMute = false;
    if (!selfDeaf) selfDeaf = false;
    if (guildId && guildId != this.voiceState.guildId) {
      this.disconnectVoice();
    }
    Object.assign(this.voiceState, {
      guildId: guildId,
      channelId: channelId,
      selfMute: selfMute,
      selfDeaf: selfDeaf
    });
    this.send(OPCODE_VOICE_STATE_UPDATE, {
      guild_id: guildId,
      channel_id: channelId,
      self_mute: selfMute,
      self_deaf: selfDeaf
    });
  }
  voiceServerPing() {
    this.socket.send(OPCODE_VOICE_SERVER_PING, null);
  }
  requestGuildMembers(guildId, query, limit) {
    this.socket.send(OPCODE_REQUEST_GUILD_MEMBERS, {
      guild_id: guildId,
      query: query || "",
      limit: limit || 0
    });
  }

  createVoiceSocket(endpoint, guildId, userId, sessionId, token) {
    const canReconnect = endpoint ? true : false;
    this.disconnectVoice(canReconnect);
    if (!canReconnect) return;
    this.voiceSocket = new VoiceSocket(this);
    this.voiceSocket.connect(
      endpoint.split(":")[0],
      guildId, userId, sessionId, token
    );
  }
  disconnectVoice(reconnect, error) {
    if (this.voiceSocket) {
      this.voiceSocket.disconnect(error);
      this.voiceSocket = null;

      if (!reconnect && this.connected)
        this.voiceStateUpdate(null, null);
    }
  }
  toJSON() { return `[GatewaySocket ${this.gatewayURL}]`; }
}

module.exports = GatewaySocket;

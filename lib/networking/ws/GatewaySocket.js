"use strict";

const urlutils = require("url");
const pako = require("pako");
const BaseSocket = require("./BaseSocket");
const VoiceSocket = require("./VoiceSocket");
const Constants = require("../../Constants");
const Errors = Constants.Errors;
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
const OPCODE_RECONNECT = 7;
const OPCODE_REQUEST_GUILD_MEMBERS = 8;
const OPCODE_INVALID_SESSION = 9;

const ERROR_INVALID_MESSAGE = 4002; // ?
// 4002 also fires when message is longer than 4096 bytes @2016-03-25
const ERROR_RESUME_DISCONNECTED_SESSION = 4003; // ?
const ERROR_AUTHENTICATION_FAILED = 4004;
const ERROR_RESUME_INVALID_SESSION = 4006; // ?
const ERROR_RATE_LIMITED = 4008;
const IS_DISCORD_ERROR = error => ((+error) / 1000 | 0) === 4;

const ETF = false;
const ENCODING = ETF ? "etf" : "json";
const VERSION = 4;

const GATEWAY_READY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const discordie = new WeakMap();


class GatewaySocket {
  constructor(_discordie, compressMessages) {
    discordie.set(this, _discordie);
    this.Dispatcher = _discordie.Dispatcher;
    this.socket = null;

    this.compressed = compressMessages;
    Object.defineProperty(this, "compressed", {writable: false});

    this.voiceStates = new Map();
    this.voiceSockets = new Map();

    this.userId = null;
    this.sendQueue = [];
    this.resumeAttempts = 0;
    this.seq = 0;

    this._readyTimeout = null;
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

    const connectURL = urlutils.parse(this.gatewayURL);
    connectURL.query = {encoding: ENCODING, v: VERSION};
    connectURL.pathname = connectURL.pathname || "/";

    let ws = this.socket = new BaseSocket(urlutils.format(connectURL));
    const onOpen = () => {
      const token = discordie.get(this).token;

      if (!token) {
        this.Dispatcher.emit(
          Events.DISCONNECTED,
          {error: new DiscordieError("No token specified")}
        );
        return this.disconnect();
      }

      if (this.seq > 0) {
        this.resumeAttempts++;
        return this.resume(token);
      }

      this.identify(token);

      ws._startTimeout(() => {
        this.Dispatcher.emit(
          Events.DISCONNECTED, {
            error: new DiscordieError(
              "Failed to connect to gateway: READY timed out"
            )
          }
        );

        return this.disconnect();
      }, GATEWAY_READY_TIMEOUT);
    };
    ws.on("open", e => {
      this.Dispatcher.emit(Events.GATEWAY_OPEN, {socket: this});
      onOpen();
    });
    ws.on("message", e => {
      if (this.socket != ws) return;

      if (this.compressed && e instanceof Buffer) {
        e = pako.inflate(e, {to: "string"});
      }
      const msg = JSON.parse(e);
      const op = msg.op;
      const seq = msg.s;
      const type = msg.t;
      const data = msg.d;

      if (seq && this.sessionId) this.seq = seq;

      if (op === OPCODE_RECONNECT) {
        this.disconnect(OPCODE_RECONNECT, "Reconnecting", true);
        this.connect(data && data.url);
      }
      if (op === OPCODE_INVALID_SESSION) {
        this.resetSession();
        onOpen();
      }
      if (op === OPCODE_HEARTBEAT) {
        this.heartbeat();
      }
      if (op === OPCODE_DISPATCH) {
        if (type === "READY" || type === "RESUMED") {
          ws._stopTimeout();

          if (type === "READY") {
            this.sessionId = data.session_id;
            this.userId = data.user.id;
          }

          let payload;
          while (payload = this.sendQueue.shift()) {
            ws.send(payload);
          }

          if (data.heartbeat_interval > 0) {
            ws.setHeartbeat(
              () => this.heartbeat(),
              data.heartbeat_interval
            );

            this.heartbeat();
          }
        }

        setImmediate(() => {
          this.Dispatcher.emit(
            Events.GATEWAY_DISPATCH,
            {socket: this, type: type, data: data}
          );
        })
      }
    });

    const close = (code, desc) => {
      if (this.socket != ws) return;

      this.disconnect(code, desc, true);

      if (this.isPrimary) {
        this.Dispatcher.emit(
          Events.DISCONNECTED,
          {error: new DiscordieError("Disconnected from primary gateway", code)}
        );
      }
    };
    ws.on("close", close);
    ws.on("error", close);
  }
  send(op, data) {
    if (!this.connected) {
      this.sendQueue.push(JSON.stringify({op: op, data: data}));
      return;
    }
    this.socket.send(op, data);
  }
  resetSession() {
    this.sendQueue.length = 0;
    this.sendQueue = [];
    this.resumeAttempts = 0;
    this.seq = 0;
    delete this.sessionId;
  }
  disconnect(error, description, causedByEvent) {
    if (!causedByEvent || IS_DISCORD_ERROR(error)) {
      this.seq = 0;
      delete this.sessionId;
    }

    var voiceError = new Error(Errors.VOICE_DISCONNECTED_FROM_GATEWAY(error));
    this.disconnectAllVoice(causedByEvent ? voiceError : undefined);

    if (this.connected) {
      this.socket.close();

      let msg = {socket: this};
      if (error) msg.error = error;
      if (description) msg.description = description;
      this.Dispatcher.emit(Events.GATEWAY_DISCONNECT, msg);
    }

    this.socket.readyState = Constants.ReadyState.CLOSED;
    if (this.resumeAttempts > 1) {
      this.seq = 0;
      this.resumeAttempts = 0;
    }
    this.sendQueue.length = 0;
    this.sendQueue = [];
  }
  heartbeat() {
    this.send(OPCODE_HEARTBEAT, this.seq);
  }
  resume(token) {
    this.socket.send(OPCODE_RESUME, {
      token: token,
      session_id: this.sessionId,
      seq: this.seq
    });
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
  voiceStateUpdate(guildId, channelId, selfMute, selfDeaf, external) {
    if (!guildId) guildId = null;
    if (!channelId) channelId = null;
    if (!selfMute) selfMute = false;
    if (!selfDeaf) selfDeaf = false;

    var voiceState = this.voiceStates.get(guildId);
    if (guildId) {
      if (channelId && !voiceState) {
        this.voiceStates.set(guildId, voiceState = {});
      }
      if (!channelId && voiceState) {
        if (!external) this.disconnectVoice(guildId, true /* noStateUpdate */);
        this.voiceStates.delete(guildId);
      }
      if (!channelId && !voiceState) {
        return;
      }
    }

    if (!guildId && !channelId) {
      // disconnect all and send VOICE_STATE_UPDATE for each guild
      this.disconnectAllVoice();
    }

    if (voiceState) {
      Object.assign(voiceState, {
        guildId: guildId,
        channelId: channelId,
        selfMute: selfMute,
        selfDeaf: selfDeaf
      });
    }

    // only update local state if received a voice state update from Discord
    if (external) return;

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
    if (!this.connected) return;
    if (!guildId) throw new TypeError("Invalid guildId parameter");

    const canReconnect = endpoint ? true : false;
    // endpoint null means server will send it later?
    this.disconnectVoice(
      guildId, true /* noStateUpdate */,
      new Error(Errors.VOICE_CHANGING_SERVER)
    );

    if (!canReconnect) return;

    if (!discordie.get(this).VoiceConnections._isPending(guildId)) return;

    var voiceSocket = new VoiceSocket(this, guildId);
    this.voiceSockets.set(guildId, voiceSocket);

    voiceSocket.connect(
      endpoint.split(":")[0],
      guildId, userId, sessionId, token
    );
  }
  disconnectVoice(guildId, noStateUpdate, error) {
    const voiceSocket = this.voiceSockets.get(guildId);
    if (!voiceSocket) return;

    this.voiceSockets.delete(guildId);
    voiceSocket.disconnect(error);

    if (!noStateUpdate && this.connected)
      this.voiceStateUpdate(guildId, null);
  }
  disconnectAllVoice(error) {
    for (var voiceSocket of this.voiceSockets.values())
      voiceSocket.disconnect(error);

    this.voiceSockets.clear();
    this.voiceStates.clear();
  }
  toJSON() { return `[GatewaySocket ${this.gatewayURL}]`; }
}

module.exports = GatewaySocket;

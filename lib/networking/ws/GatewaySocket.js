"use strict";

const urlutils = require("url");
const pako = require("pako");
const BaseSocket = require("./BaseSocket");
const VoiceSocket = require("./VoiceSocket");
const Constants = require("../../Constants");
const Errors = Constants.Errors;
const DiscordieError = require("../../core/DiscordieError");
const Events = Constants.Events;
const Profiler = require("../../core/DiscordieProfiler");

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
const OPCODE_HELLO = 10;
const OPCODE_HEARTBEAT_ACK = 11;
const OPCODE_SYNC_GUILDS = 12;
const OPCODE_CALL_CONNECT = 13;

const ERROR_UNKNOWN = 4000;
const ERROR_UNKNOWN_OPCODE = 4001;
const ERROR_INVALID_MESSAGE = 4002;
// 4002 also fires when message is longer than 4096 bytes @2016-03-25
const ERROR_NOT_AUTHENTICATED = 4003;
const ERROR_AUTHENTICATION_FAILED = 4004;
const ERROR_ALREADY_AUTHENTICATED = 4005;
const ERROR_RESUME_INVALID_SESSION = 4006;
const ERROR_INVALID_SEQ = 4007;
const ERROR_RATE_LIMITED = 4008;
const ERROR_SESSION_TIMEOUT = 4009;
const ERROR_INVALID_SHARD = 4010;
const ERROR_SHARDING_REQUIRED = 4011;
const ERROR_INVALID_API_VERSION = 4012;
const ERROR_INVALID_INTENTS = 4013;
const ERROR_DISALLOWED_INTENTS = 4014;
const IS_DISCORD_ERROR = error => ((+error) / 1000 | 0) === 4;

const ETF = false;
const ENCODING = ETF ? "etf" : "json";
const VERSION = Constants.API_VERSION;

const COMPRESSION_TYPE_ZLIB_STREAM = "zlib-stream";

const GATEWAY_READY_TIMEOUT = 1 * 60 * 1000; // 1 minute
const HEARTBEAT_MAX_RESUME_THRESHOLD = 3 * 60 * 1000; // 3 minutes

const discordie = new WeakMap();

class GatewaySocket {
  constructor(_discordie, options) {
    discordie.set(this, _discordie);
    this.Dispatcher = _discordie.Dispatcher;
    this.socket = null;

    Object.defineProperties(this, {
      compressed:      {writable: false, value: options.compressMessages},
      compressionType: {writable: false, value: options.compressionType},
      largeThreshold: {writeable: false, value: options.largeThreshold},
      shardId:         {writable: false, value: options.shardId},
      shardCount:      {writable: false, value: options.shardCount},
      intents:         {writeable: false, value: options.intents}
    });

    this._validateOptions();

    this.voiceStates = new Map();
    this.voiceSockets = new Map();

    this.userId = null;
    this.sendQueue = [];
    this.seq = 0;
    this.heartbeatAck = false;
    this.lastHeartbeatAckTime = null;
    this.lastHeartbeatSentTime = null;
    this.latency = null;

    this.remoteGatewayVersion = -1;
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

    if (this.compressed && this.compressionType) {
      connectURL.query.compress = this.compressionType;
    }
    const inflate = new pako.Inflate({ to: "string" });

    let ws = this.socket = new BaseSocket(urlutils.format(connectURL));
    const onOpen = () => {
      const token = discordie.get(this).token;

      if (!token) {
        this._reportDisconnect(new DiscordieError("No token specified"));
        return this.disconnect();
      }

      this.resumeOrIdentify(token);

      ws._startTimeout(() => {
        if (this.isPrimary) {
          this._reportDisconnect(
            new DiscordieError("Failed to connect to gateway: READY timed out")
          );
        }

        return this.disconnect();
      }, GATEWAY_READY_TIMEOUT);
    };
    ws.on("open", e => {
      this.Dispatcher.emit(Events.GATEWAY_OPEN, {socket: this});
      onOpen();
    });
    ws.on("message", e => {
      if (this.socket != ws) return;

      const isBlob = (e instanceof Buffer || e instanceof ArrayBuffer);
      if (this.compressed && isBlob) {
        if (this.compressionType === COMPRESSION_TYPE_ZLIB_STREAM) {
          const block = e instanceof Buffer ? e : new Uint8Array(e);
          const blockLength = block.length;
          const flush =
            blockLength >= 4 &&
            block[blockLength - 4] === 0x00 &&
            block[blockLength - 3] === 0x00 &&
            block[blockLength - 2] === 0xFF &&
            block[blockLength - 1] === 0xFF;

          inflate.push(e, flush ? pako.Z_SYNC_FLUSH : false);
          if (!flush) return;

          if (inflate.err !== pako.Z_OK) {
            if (this.connected) {
              const errorMessage =
                `Zlib returned error: ${inflate.msg} (${inflate.err})`;
              this.disconnect(ERROR_UNKNOWN, errorMessage, true);
              if (this.isPrimary) {
                this._reportDisconnect(new DiscordieError(errorMessage));
              }
            }
            return;
          }

          e = inflate.result;
        } else {
          e = pako.inflate(e, {to: "string"});
        }
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
        const canResume = data;
        if (!canResume) {
          this.resetSession();
        }
        onOpen();
      }

      if (op === OPCODE_HEARTBEAT) {
        this.heartbeat();
      }
      if (op === OPCODE_HEARTBEAT_ACK) {
        this.lastHeartbeatAckTime = Profiler.hrtime();
        this.heartbeatAck = true;
        this.latency = this.lastHeartbeatAckTime - this.lastHeartbeatSentTime;
      }
      if (op === OPCODE_HELLO) {
        if (data && data.heartbeat_interval > 0) {
          this.heartbeatAck = true;
          const sendHeartbeat = () => {
            if (!this.heartbeatAck) {
              const errorMessage = "Heartbeat ACK did not arrive in time";
              this.disconnect(OPCODE_HEARTBEAT_ACK, errorMessage, true);
              if (this.isPrimary) {
                this._reportDisconnect(new DiscordieError(errorMessage));
              }
              return;
            }
            this.heartbeatAck = false;
            this.heartbeat();
          };

          ws.setHeartbeat(sendHeartbeat, data.heartbeat_interval);
        }

        this.Dispatcher.emit(
          Events.GATEWAY_HELLO,
          {socket: this, data: data}
        );
      }

      if (op === OPCODE_DISPATCH) {
        if (type === "READY" || type === "RESUMED") {
          ws._stopTimeout();

          this._resetBackoff();

          if (type === "READY") {
            this.disconnectAllVoice(Errors.VOICE_SESSION_INVALIDATED);
            this.remoteGatewayVersion = data.v != null ? data.v : VERSION;
            this.sessionId = data.session_id;
            this.userId = data.user.id;
          }

          let payload;
          while (payload = this.sendQueue.shift()) {
            ws.send(payload.op, payload.data);
          }

          if (type === "RESUMED") {
            this._updateDisconnectedVoiceStates();
          }

          // V4 heartbeats
          if (data.heartbeat_interval > 0) {
            ws.setHeartbeat(() => this.heartbeat(), data.heartbeat_interval);
            this.heartbeat();
          }
        }

        this.Dispatcher.emit(
          Events.GATEWAY_DISPATCH,
          {socket: this, type: type, data: data}
        );
      }
    });

    const close = (code, desc) => {
      if (this.socket != ws) return;

      this.disconnect(code, desc, true);

      if (this.isPrimary) {
        this._reportDisconnect(
          new DiscordieError("Disconnected from primary gateway", code)
        );
      }
    };
    ws.on("close", close);
    ws.on("error", close);
  }
  _resetBackoff() {
    if (!this.isPrimary) return;
    var autoReconnect = discordie.get(this).autoReconnect;
    if (autoReconnect) autoReconnect._reset();
  }
  _reportDisconnect(error) {
    var e = {error: error};
    var autoReconnect = discordie.get(this).autoReconnect;
    if (autoReconnect) autoReconnect._disconnected(e);
    this.Dispatcher.emit(Events.DISCONNECTED, e);
  }
  _getPresence() {
    const user = discordie.get(this)._user;
    if (!user || user.status === Constants.StatusTypes.OFFLINE) return null;
    return {
      status: user.status,
      since: user.status === Constants.StatusTypes.IDLE ? Date.now() : null,
      afk: user.afk,
      game: user.game
    };
  }
  send(op, data) {
    if (!this.connected) {
      this.sendQueue.push({op: op, data: data});
      return;
    }
    this.socket.send(op, data);
  }
  resetSession() {
    this.sendQueue = [];
    this.seq = 0;
    delete this.sessionId;
  }
  disconnect(error, description, causedByEvent) {
    console.log('internal disconnect function', error, description, causedByEvent)
    const cleanDisconnect = (error === 1000 || error === 1001);
    const authFailed = (error === ERROR_AUTHENTICATION_FAILED);
    const invalidIntent = (error === ERROR_INVALID_INTENTS);
    const disallowedIntent = (error = ERROR_DISALLOWED_INTENTS);

    if (invalidIntent || disallowedIntent) {
      this.seq = 0;
      delete this.sessionId;
      if (discordie.get(this).autoReconnect.enabled) discordie.get(this).autoReconnect.disable();
    }

    if (!causedByEvent || authFailed || cleanDisconnect) {
      this.seq = 0;
      delete this.sessionId;

      var voiceError = new Error(Errors.VOICE_DISCONNECTED_FROM_GATEWAY(error));
      this.disconnectAllVoice(causedByEvent ? voiceError : undefined);
    }

    if (this.connected) {
      if (error === OPCODE_RECONNECT || error === OPCODE_HEARTBEAT_ACK) {
        this.socket.close(4000);
      } else {
        this.socket.close();
      }

      let msg = {socket: this};
      if (error) msg.error = error;
      if (description) msg.description = description;
      console.log(`internal lib dc msg ${require('util').inspect(msg)}`)
      this.Dispatcher.emit(Events.GATEWAY_DISCONNECT, msg);
    }

    this.socket.readyState = Constants.ReadyState.CLOSED;
    this.sendQueue = [];
  }
  heartbeat() {
    this.send(OPCODE_HEARTBEAT, this.seq);
    this.lastHeartbeatSentTime = Profiler.hrtime();
  }
  resumeOrIdentify(token) {
    const now = Profiler.hrtime();
    const heartbeatTimedOut =
      this.lastHeartbeatAckTime != null &&
      ((now - this.lastHeartbeatAckTime) > HEARTBEAT_MAX_RESUME_THRESHOLD);

    if (this.sessionId && !heartbeatTimedOut) {
      this.resume(token);
    } else {
      this.identify(token);
    }

    this.lastHeartbeatAckTime = now;
  }
  resume(token) {
    this.socket.send(OPCODE_RESUME, {
      token: token,
      session_id: this.sessionId,
      seq: this.seq
    });
  }
  identify(token) {
    const data = {
      token: token,
      properties: {
        "$os": process.platform,
        "$browser": "Discordie",
        "$device": "Discordie"
      },
      v: VERSION,
      compress: this.compressed || false
    };

    if (this.shardCount > 0) {
      data.shard = [this.shardId || 0, this.shardCount || 0];
    }

    if (this.largeThreshold > 50 && this.largeThreshold < 250) {
      data.large_threshold = this.largeThreshold
    }

    const presence = this._getPresence();
    if (presence) {
      data.presence = presence;
    }

    const intents = this.intents
    if (typeof intents === 'number') {
      data.intents = intents
    } else if (Array.isArray(intents)) {
      let bitmask = 0
      for (const intent of intents) {
        if (Constants.Intents[intent]) {
          bitmask |= Constants.Intents[intent]
        }
      }
      data.intents = bitmask
    }

    this.socket.send(OPCODE_IDENTIFY, data);
  }
  statusUpdate(status, since, game, afk) {
    this.send(OPCODE_STATUS_UPDATE, {
      status: String(status),
      since: Number(since) || 0,
      afk: !!afk,
      game: game || null
    });
  }
  voiceStateUpdate(guildId, channelId, selfMute, selfDeaf, external) {
    if (!guildId) guildId = null;
    if (!channelId) channelId = null;
    if (!selfMute) selfMute = false;
    if (!selfDeaf) selfDeaf = false;

    var voiceState = this.voiceStates.get(guildId);

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
  syncGuilds(guildIds) {
    this.socket.send(OPCODE_SYNC_GUILDS, guildIds);
  }
  callConnect(channelId) {
    this.send(OPCODE_CALL_CONNECT, {
      channel_id: channelId
    });
  }

  createVoiceSocket(endpoint, guildId, channelId, userId, sessionId, token) {
    if (!this.connected) return;

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

    const serverId = guildId || channelId;
    voiceSocket.connect(
      endpoint.split(":")[0],
      serverId, userId, sessionId, token
    );
  }
  disconnectVoice(guildId, noStateUpdate, error) {
    const voiceSocket = this.voiceSockets.get(guildId);
    if (!voiceSocket) return;

    this.voiceSockets.delete(guildId);
    voiceSocket.disconnect(error);

    if (!noStateUpdate)
      this.voiceStateUpdate(guildId, null);
  }
  disconnectAllVoice(error) {
    for (var voiceSocket of this.voiceSockets.values())
      voiceSocket.disconnect(error);

    this.voiceSockets.clear();
    this.voiceStates.clear();
  }
  _updateDisconnectedVoiceStates() {
    if (!this.connected) return;

    for (const guildId of this.voiceStates.keys()) {
      if (!this.voiceSockets.get(guildId)) {
        this.voiceStateUpdate(guildId, null);
      }
    }
  }
  toJSON() { return `[GatewaySocket ${this.gatewayURL}]`; }

  _validateOptions() {
    if (this.compressed && this.compressionType) {
      if (this.compressionType !== COMPRESSION_TYPE_ZLIB_STREAM) {
        throw new TypeError("Unknown compression type: " + this.compressionType);
      }
    }

    if (this.shardId != null && this.shardCount == null) {
      throw new TypeError("Key 'shardId' is set but 'shardCount' is undefined");
    }

    if (this.shardId == null && this.shardCount != null) {
      throw new TypeError("Key 'shardCount' is set but 'shardId' is undefined");
    }

    if (this.shardCount) {
      if (typeof this.shardId !== "number" ||
        typeof this.shardCount !== "number") {
        throw new TypeError("Keys 'shardId' and 'shardCount' must be numbers");
      }

      if (!this.shardCount || this.shardCount <= 1) {
        throw new TypeError("Key 'shardCount' must be a number greater than 1");
      }

      if (this.shardId >= this.shardCount) {
        throw new TypeError("Key 'shardId' cannot be higher than 'shardCount'");
      }

      if (this.shardId < 0) {
        throw new TypeError("Key 'shardId' cannot be less than 0");
      }
    }

    if (this.largeThreshold) {
      if (typeof this.largeThreshold !== 'number') {
        throw new TypeError("Key 'largeThreshold' must be a number")
      }

      if (this.largeThreshold < 50 || this.largeThreshold > 250) {
        throw new TypeError("key 'largeThreshold' must be lower than 50 and not higher than 250")
      }
    }

    if (this.intents) {
      if (!Array.isArray(this.intents) && typeof this.intents !== 'number') {
        throw new TypeError("Key 'intents' is set but is not an array or integer")
      }

      if (typeof this.intents === 'number') {
        if (this.intents > 32767) {
          throw new TypeError("Key 'intents' cannot be higher than '32767'")
        }

        if (this.intents < 0) {
          throw new TypeError("Key 'intents' cannot be less than '0'")
        }
      }

      if (Array.isArray(this.intents)) {
        if (this.intents.includes('ALL') && this.intents.length > 1) {
          throw new TypeError("Key 'intents' is set with specified 'ALL' and another intent")
        }
      }
    }

  }
}

module.exports = GatewaySocket;

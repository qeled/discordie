"use strict";

const Constants = require("../Constants");
const Errors = Constants.Errors;
const Events = Constants.Events;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");
const IVoiceConnection = require("../interfaces/IVoiceConnection");

/**
 * @class
 */
class VoiceConnectionInfo {
  constructor(gatewaySocket, voiceSocket, voiceConnection) {
    /**
     * @instance
     * @memberOf VoiceConnectionInfo
     * @name gatewaySocket
     * @returns {GatewaySocket}
     */
    this.gatewaySocket = gatewaySocket;

    /**
     * @instance
     * @memberOf VoiceConnectionInfo
     * @name voiceSocket
     * @returns {VoiceSocket}
     */
    this.voiceSocket = voiceSocket;

    /**
     * @instance
     * @memberOf VoiceConnectionInfo
     * @name voiceConnection
     * @returns {IVoiceConnection}
     */
    this.voiceConnection = voiceConnection;
    Object.freeze(this);
  }
}

class VoiceConnectionCollection extends Array {
  constructor(discordie, primaryGateway) {
    super();

    this._gateways = new Set();

    this._pendingConnections = new Map();
    discordie.Dispatcher.on(Events.VOICE_SESSION_DESCRIPTION, e => {
      var voiceSocket = e.socket;

      var guildId = voiceSocket.guildId;
      var pending = this._pendingConnections.get(guildId);
      if (!pending) return;

      this._pendingConnections.delete(guildId);
      pending.resolve(this.getForVoiceSocket(voiceSocket));
    });
    discordie.Dispatcher.on(Events.VOICESOCKET_DISCONNECT, e => {
      var voiceSocket = e.socket;
      var gatewaySocket = e.socket.gatewaySocket;

      var guildId = voiceSocket.guildId;
      var pending = this._pendingConnections.get(guildId);
      if (!pending) return;

      gatewaySocket.disconnectVoice(guildId);

      this._pendingConnections.delete(guildId);
      e ? pending.reject(e.error) : pending.reject();
    });

    // emit events after handling pending connections

    discordie.Dispatcher.on(Events.VOICE_SESSION_DESCRIPTION, e => {
      const gw = e.socket.gatewaySocket;
      const voicews = e.socket;

      const voiceConnection = new IVoiceConnection(discordie, gw, voicews);
      this.push(new VoiceConnectionInfo(gw, voicews, voiceConnection));

      discordie.Dispatcher.emit(Events.VOICE_CONNECTED, {
        socket: voicews,
        voiceConnection: voiceConnection
      });
    });
    discordie.Dispatcher.on(Events.VOICESOCKET_DISCONNECT, e => {
      const idx = this.findIndex(c => c.voiceSocket == e.socket);
      if (idx < 0) return;

      var info = this[idx];

      // delete from this array
      this.splice(idx, 1);

      var guildId = info.voiceSocket.guildId;

      const awaitingEndpoint =
        e.error && e.error.message == Errors.VOICE_CHANGING_SERVER;

      const endpointAwait =
        awaitingEndpoint ? this._createPending(guildId) : null;

      discordie.Dispatcher.emit(Events.VOICE_DISCONNECTED, {
        socket: info.voiceSocket,
        voiceConnection: info.voiceConnection,
        error: (e.error instanceof Error) ? e.error : null,
        manual: (!e.error),
        endpointAwait
      });

      if (guildId && !endpointAwait)
        info.gatewaySocket.disconnectVoice(guildId);
      info.voiceConnection.dispose();
    });
    discordie.Dispatcher.on(Events.CHANNEL_DELETE, e => {
      const info = this.getForChannel(e.channelId);
      if (info) info.voiceConnection.disconnect();
    });
    discordie.Dispatcher.on(Events.GUILD_DELETE, e => {
      const info = this.getForGuild(e.guildId);
      if (info) info.voiceConnection.disconnect();
    });
    discordie.Dispatcher.on(Events.ANY_GATEWAY_READY,
        e => this._gateways.add(e.socket)
    );
    discordie.Dispatcher.on(Events.GATEWAY_DISCONNECT,
        e => this._gateways.delete(e.socket)
    );

    this._discordie = discordie;
    Utils.privatify(this);
  }
  _createPending(guildId) {
    return this._getOrCreate(guildId, null, null, null, true);
  }
  _getOrCreate(guildId, channelId, selfMute, selfDeaf, silent) {
    const gateway = this._discordie.gatewaySocket;
    if (!gateway || !gateway.connected)
      return Promise.reject("No gateway socket (not connected)");

    var newState = {guildId, channelId, selfMute, selfDeaf};
    if (!silent && this.shouldUpdateVoiceState(newState))
      gateway.voiceStateUpdate(guildId, channelId, selfMute, selfDeaf);

    if (!guildId) return;

    let pending = this._pendingConnections.get(guildId);
    if (pending) return pending.promise;

    const existing = this.getForGuild(guildId);
    if (existing) return Promise.resolve(existing);

    pending = {promise: null, resolve: null, reject: null};
    this._pendingConnections.set(guildId, pending);

    return (pending.promise = new Promise((rs, rj) => {
      pending.resolve = rs;
      pending.reject = rj;
    }));
  }
  getForGuild(guildId) {
    guildId = guildId.valueOf();
    return this.find(c => c.voiceSocket.guildId == guildId) || null;
  }
  getForChannel(channelId) {
    channelId = channelId.valueOf();
    for (var gatewaySocket of this._gateways.values()) {
      for (var voiceState of gatewaySocket.voiceStates.values()) {
        if (!voiceState || voiceState.channelId !== channelId) continue;
        return this.getForGuild(voiceState.guildId);
      }
    }
    return null;
  }
  getForVoiceSocket(voiceSocket) {
    return this.find(c => c.voiceSocket == voiceSocket) || null;
  }
  getForGatewaySocket(gatewaySocket) {
    return this.find(c => c.gatewaySocket == gatewaySocket) || null;
  }
  isLocalSession(sessionId) {
    return !!Array.from(this._gateways).find(gw => gw.sessionId == sessionId);
  }
  shouldUpdateVoiceState(newState) {
    var guildId = newState.guildId;
    if (!guildId) return false;

    for (var gatewaySocket of this._gateways.values()) {
      var state = gatewaySocket.voiceStates.get(guildId);
      if (!state) continue;
      var hasChanges = Object.keys(state).reduce((r, key) => {
        return r ||
          (newState[key] !== undefined && newState[key] != state[key]);
      }, false);
      return hasChanges;
    }
    return true;
  }
}

module.exports = VoiceConnectionCollection;

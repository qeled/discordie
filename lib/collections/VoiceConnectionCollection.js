"use strict";

const Constants = require("../Constants");
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

    discordie.Dispatcher.on(Events.VOICE_SESSION_DESCRIPTION, e => {
      const gw = e.socket.gatewaySocket;
      const voicews = e.socket;
      const voiceConnection = new IVoiceConnection(discordie, gw);
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

      discordie.Dispatcher.emit(Events.VOICE_DISCONNECTED, {
        socket: info.voiceSocket,
        voiceConnection: info.voiceConnection
      });

      // kill secondary gateway socket and voice socket
      const gw = info.gatewaySocket;
      if (!gw.isPrimary) gw.disconnect();
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
    // todo: handle secondary gateway voice reconnects?

    this._discordie = discordie;
    Utils.privatify(this);
  }
  _getOrCreate(guildId, channelId, selfMute, selfDeaf) {
    const existing = this.getForGuild(guildId);
    if (existing) {
      existing.gatewaySocket.voiceStateUpdate(
        guildId, channelId, selfMute, selfDeaf
      );
      return Promise.resolve(existing);
    }

    const Dispatcher = this._discordie.Dispatcher;
    const attach = (e, h) => Dispatcher.on(e, h);
    const detach = (e, h) => Dispatcher.removeListener(e, h);

    // todo: refactor into eventemitter sockets? or meh?

    const awaitGateway = (rs, rj, targetGateway) => {
      const handleGatewayConnect = (e) => {
        if (e.socket != targetGateway) return;
        e.socket.voiceStateUpdate(guildId, channelId, selfMute, selfDeaf);

        unbindGatewayEvents();

        awaitVoice(rs, rj, e.socket);
      };
      const handleGatewayDisconnect = (e) => {
        if (e.socket != targetGateway) return;

        unbindGatewayEvents();

        e ? rj(e.error) : rj();
      };

      attach(Events.ANY_GATEWAY_READY, handleGatewayConnect);
      attach(Events.GATEWAY_DISCONNECT, handleGatewayDisconnect);
      function unbindGatewayEvents() {
        detach(Events.ANY_GATEWAY_READY, handleGatewayConnect);
        detach(Events.GATEWAY_DISCONNECT, handleGatewayDisconnect);
      }
    };

    const awaitVoice = (rs, rj, targetGateway) => {
      // we need to go deeper
      // discord pls

      const handleVoiceConnect = (e) => {
        if (e.socket.gatewaySocket != targetGateway) return;
        unbindVoiceEvents();

        rs(this.getForVoiceSocket(e.socket));
      };
      const handleVoiceDisconnect = (e) => {
        if (e.socket.gatewaySocket != targetGateway) return;

        targetGateway.isPrimary ?
          targetGateway.disconnectVoice() :
          targetGateway.disconnect();

        unbindVoiceEvents();

        e ? rj(e.error) : rj();
      };

      attach(Events.VOICE_SESSION_DESCRIPTION, handleVoiceConnect);
      attach(Events.VOICESOCKET_DISCONNECT, handleVoiceDisconnect);
      function unbindVoiceEvents() {
        detach(Events.VOICE_SESSION_DESCRIPTION, handleVoiceConnect);
        detach(Events.VOICESOCKET_DISCONNECT, handleVoiceDisconnect);
      }
    };

    if (this.length == 0) {
      const primary = this._discordie.gatewaySocket;
      if (!primary) throw new Error("No primary gateway socket");
      primary.voiceStateUpdate(guildId, channelId, selfMute, selfDeaf);
      return new Promise((rs, rj) => awaitVoice(rs, rj, primary));
    }

    const secondary = this._discordie._createSecondaryGateway();

    return new Promise((rs, rj) => awaitGateway(rs, rj, secondary));
  }
  getForGuild(guildId) {
    guildId = guildId.valueOf();
    const filter = c => (c.gatewaySocket.voiceState.guildId == guildId);
    return this.find(filter) || null;
  }
  getForChannel(channelId) {
    channelId = channelId.valueOf();
    const filter = c => (c.gatewaySocket.voiceState.channelId == channelId);
    return this.find(filter) || null;
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
  disconnectSecondary() {
    this.forEach(c => {
      if (!c.gatewaySocket.isPrimary)
        c.gatewaySocket.disconnect();
    });
  }
}

module.exports = VoiceConnectionCollection;

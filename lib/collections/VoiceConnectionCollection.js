"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");
const IVoiceConnection = require("../interfaces/IVoiceConnection");

class VoiceConnectionCollection extends Array {
  constructor(discordie, primaryGateway) {
    super();

    discordie.Dispatcher.on(Events.VOICE_SESSION_DESCRIPTION, e => {
      const gw = e.socket.gatewaySocket;
      const voicews = e.socket;
      const voiceConnection = new IVoiceConnection(discordie, gw);
      this.push(Object.freeze({
        gatewaySocket: gw,
        voiceSocket: voicews,
        voiceConnection: voiceConnection
      }));

      discordie.Dispatcher.emit(Events.VOICE_CONNECTED, {
        socket: this,
        voiceConnection: voiceConnection
      });
    });
    discordie.Dispatcher.on(Events.VOICESOCKET_DISCONNECT, e => {
      const idx = this.findIndex(c => c.voiceSocket == e.socket);
      if (idx >= 0) {
        discordie.Dispatcher.emit(Events.VOICE_DISCONNECTED, {
          socket: this[idx].voiceSocket,
          voiceConnection: this[idx].voiceConnection
        });

        // kill secondary gateway socket and voice socket
        const gw = this[idx].gatewaySocket;
        if (!gw.isPrimary) gw.disconnect();

        // delete from this array
        this.splice(idx, 1);
      }
    });
    // todo: handle secondary gateway voice reconnects?

    this._discordie = discordie;
    Utils.privatify(this);
  }
  _getOrCreate(guildId, channelId, selfMute, selfDeaf) {
    const existing = this.getForGuild(guildId);
    if (existing) return Promise.resolve(existing);

    const Dispatcher = this._discordie.Dispatcher;

    // todo: refactor into eventemitter sockets? or meh?

    const awaitGateway = (rs, rj, targetGateway) => {
      const handleGatewayConnect = (e) => {
        if (e.socket != targetGateway) return;
        e.socket.voiceStateUpdate(guildId, channelId, selfMute, selfDeaf);

        awaitVoice(rs, rj, e.socket);

        unbindGatewayEvents();
      };
      const handleGatewayDisconnect = (e) => {
        if (e.socket != targetGateway) return;
        unbindGatewayEvents();
        rj(e);
      };

      Dispatcher.on(Events.GATEWAY_READY, handleGatewayConnect);
      Dispatcher.on(Events.GATEWAY_DISCONNECT, handleGatewayDisconnect);
      function unbindGatewayEvents() {
        Dispatcher.removeListener(Events.GATEWAY_READY, handleGatewayConnect);
        Dispatcher.removeListener(Events.GATEWAY_DISCONNECT, handleGatewayDisconnect);
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
        unbindVoiceEvents();
        rj(e);
      };

      Dispatcher.on(Events.VOICE_SESSION_DESCRIPTION, handleVoiceConnect);
      Dispatcher.on(Events.VOICESOCKET_DISCONNECT, handleVoiceDisconnect);
      function unbindVoiceEvents() {
        Dispatcher.removeListener(Events.VOICE_SESSION_DESCRIPTION, handleVoiceConnect);
        Dispatcher.removeListener(Events.VOICESOCKET_DISCONNECT, handleVoiceDisconnect);
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
    return this
      .find(c => c.gatewaySocket.voiceState.guildId == guildId) || null;
  }
  getForChannel(channelId) {
    return this
      .find(c => c.gatewaySocket.voiceState.channelId == channelId) || null;
  }
  getForVoiceSocket(voiceSocket) {
    return this
        .find(c => c.voiceSocket == voiceSocket) || null;
  }
  disconnectSecondary() {
    this.forEach(c => {
      if (!c.gatewaySocket.isPrimary)
        c.gatewaySocket.disconnect();
    });
  }
}

module.exports = VoiceConnectionCollection;

"use strict";

const dns = require("dns");
const udp = require("dgram");
const Constants = require("../../Constants");
const ReadyState = Constants.ReadyState;
const VoiceTransportBase = require("./VoiceTransportBase");
const DiscordieError = require("../../core/DiscordieError");
const Utils = require("../../core/Utils");

const UDP_TIMEOUT = 5000;

class VoiceUDP extends VoiceTransportBase {
  constructor(voicews, ssrc, remotehost, remoteport) {
    super(voicews, ssrc);

    this.ssrc = ssrc;

    this.remoteip = null;
    this.remotehost = remotehost;
    this.remoteport = remoteport;

    this.onConnect = function() {};
    this.onError = function() {};
    this.onTimeout = function() {};

    this.connectionTimeout = null;

    this.senderInfoTimer = null;
  }
  _timeout() {
    this.close();
    if (typeof this.onTimeout == "function")
      this.onTimeout();
  }
  _error(error) {
    this.close();
    if (typeof this.onError == "function")
      this.onError(error);
  }
  connect() {
    dns.resolve(this.remotehost, (err, servers) => {
      if (err || !servers[0])
        return this._error(`Could not resolve name '${this.remotehost}'`);

      this.remoteip = servers[0];
      this._connect();
    });
  }
  _connect() {
    this.close();
    this.socket = udp.createSocket("udp4");
    this.readyState = ReadyState.CONNECTING;

    const packet = Utils.allocBuffer(70);
    packet.fill(0);
    packet.writeUInt32BE(this.ssrc, 0);

    this.sendRaw(packet);

    this.socket.on("message", (msg, from) => {
      if (msg.length == 70) {
        if (this.readyState == ReadyState.OPEN) {
          console.warn("Warning: Late UDP initialization message");
          return;
        }

        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        const ssrc = msg.readUInt32LE(0);
        if (ssrc != this.ssrc)
          return this._error(new DiscordieError(
            `UDP received ssrc does not match (${ssrc} != ${this.ssrc})`
          ));

        this.localip = msg.slice(4, 68).toString().split("\x00")[0];
        this.localport = msg[68] | msg[69] << 8;

        this.readyState = ReadyState.OPEN;

        if (typeof this.onConnect === "function")
          this.onConnect(this.localip, this.localport);

        return;
      }

      if (this.readyState != ReadyState.OPEN) return;

      this.demux(msg);
    });

    if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
    this.connectionTimeout = setTimeout(this._timeout.bind(this), UDP_TIMEOUT);
  }
  send(packet, sampleCount) {
    this.sendRaw(this.mux(packet, sampleCount));
  }
  sendRaw(data) {
    this.socket.send(
      data, 0, data.length,
      this.remoteport, this.remoteip,
      (err, bytes) => {
        if (err) console.error(err.stack);
      }
    );
  }
  sendSenderInfo() {
    if (this.senderInfoTimer) {
      clearTimeout(this.senderInfoTimer);
      this.senderInfoTimer = null;
    }
    if (this.readyState != ReadyState.OPEN) return;
    this.sendRaw(this.updateSenderReportRTCP());
    const delay = Math.max(Math.random() * 10, 1) * 1000;
    this.senderInfoTimer = setTimeout(() => this.sendSenderInfo(), delay);
  }
  close() {
    if (this.senderInfoTimer) {
      clearTimeout(this.senderInfoTimer);
      this.senderInfoTimer = null;
    }
    if (!this.socket) return;
    this.readyState = Constants.ReadyState.CLOSED;
    this.socket.close();
    this.socket = null;
  }
}

module.exports = VoiceUDP;

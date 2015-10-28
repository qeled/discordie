"use strict";

const udp = require("dgram");
const Constants = require("../../Constants");
const VoiceTransportBase = require("./VoiceTransportBase");
const DiscordieError = require("../../core/DiscordieError");

const UDP_TIMEOUT = 5000;

class VoiceUDP extends VoiceTransportBase {
  constructor(voicews, ssrc, remoteip, remoteport) {
    super(voicews, ssrc);

    this.ssrc = ssrc;

    this.remoteip = remoteip;
    this.remoteport = remoteport;

    this.onConnect = function() {};
    this.onError = function() {};
    this.onTimeout = function() {};

    this.connectionTimeout = null;
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
    this.close();
    this.socket = udp.createSocket("udp4");
    this.readyState = Constants.ReadyState.CONNECTING;

    const packet = new Buffer(70);
    packet.fill(0);
    packet.writeUInt32BE(this.ssrc, 0);

    this.sendRaw(packet);

    this.socket.on("message", (msg, from) => {
      if (msg.length == 70) {
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

        this.readyState = Constants.ReadyState.OPEN;

        if (typeof this.onConnect === "function")
          this.onConnect(this.localip, this.localport);

        return;
      }

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
        if (err) throw err;
      }
    );
  }
  close() {
    if (!this.socket) return;
    this.readyState = Constants.ReadyState.CLOSED;
    this.socket.close();
    this.socket = null;
  }
}

module.exports = VoiceUDP;

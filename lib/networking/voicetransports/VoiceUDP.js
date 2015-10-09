"use strict";

const udp = require("dgram");
const VoiceTransportBase = require("./VoiceTransportBase");

class VoiceUDP extends VoiceTransportBase {
	constructor(voicews, ssrc, remoteip, remoteport) {
		super(voicews, ssrc);

		this.socket = udp.createSocket("udp4");
		this.ssrc = ssrc;

		this.remoteip = remoteip;
		this.remoteport = remoteport;

		this.onConnect = function() {};
	}
	connect() {
		var packet = new Buffer(70);
		packet.fill(0);
		packet.writeUInt32BE(this.ssrc, 0);

		this.sendRaw(packet);

		this.socket.on("message", (msg, from) => {
			if (msg.length == 70) {
				if (msg.readUInt32LE(0) != this.ssrc)
					throw new Error("UDP received ssrc does not match");

				this.localip = msg.slice(4, 68).toString().split("\x00")[0];
				this.localport = msg[68] | msg[69] << 8;

				if (typeof this.onConnect === "function")
					this.onConnect(this.localip, this.localport);
			}
		});

		// todo: timeout handling?
	}
	send(packet, sampleCount) {
		this.sendRaw(this.mux(packet, sampleCount));
	}
	sendRaw(data) {
		this.socket.send(data, 0, data.length, this.remoteport, this.remoteip, (err, bytes) => {
			if (err) throw err;
		});
	}
	close() {
		this.socket.unref();
	}
}

module.exports = VoiceUDP;

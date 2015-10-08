/* eslint node: true */
"use strict";

const nacl = require("ecma-nacl");
const Constants = require("../../Constants");
const Utils = require("../../core/Utils");

class VoiceTransportBase {
	constructor(voicews, ssrc) {
		this.voicews = voicews;
		this.ssrc = ssrc;

		this.header = new Buffer(24);
		this.header.fill(0);
		this.header[0] = 0x80;
		this.header[1] = 0x78;
		this.header.writeUInt32BE(ssrc, 8);

		this.reinitialize();
	}
	_encrypt(packet, nonce) {
		if (this.voicews.mode != Constants.EncryptionModes.xsalsa20_poly1305)
			return packet;

		var packetView = new Uint8Array(Utils.createArrayBuffer(packet));
		var nonceView = new Uint8Array(Utils.createArrayBuffer(nonce));

		return nacl.secret_box.pack(packetView, nonceView, this.voicews.secret);
	}
	mux(packet, sampleCount) {
		this.header.writeUInt16BE(this.sequence, 2);
		this.header.writeUInt32BE(this.timestamp, 4);

		packet = this._encrypt(packet, this.header);

		var rtpPacket = new Buffer(packet.length + 12);
		this.header.copy(rtpPacket, 0, 0, 12);
		for (let i = 0; i < packet.length; i++) {
			rtpPacket[12 + i] = packet[i];
		}

		//if(typeof this.xx == "undefined") {
		//	this.xx = new Date().getTime();
		//}
		//console.log("seq: "+this.sequence+", ts: "+this.timestamp+", d: "+(new Date().getTime() - this.xx));
		//this.xx = new Date().getTime();

		this.sequence++;
		this.timestamp += sampleCount;

		if (this.sequence >= 0xFFFF)
			this.sequence -= 0xFFFF;
		if (this.timestamp >= 0xFFFFFFFF)
			this.timestamp -= 0xFFFFFFFF;

		return rtpPacket;
	}
	reinitialize() {
		this.sequence = Math.round(Math.random() * 0xFFFF) - 1;
		this.timestamp = 0;
	}
}

module.exports = VoiceTransportBase;

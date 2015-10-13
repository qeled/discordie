"use strict";

const nacl = require("ecma-nacl");
const Constants = require("../../Constants");
const Utils = require("../../core/Utils");

class VoiceTransportBase {
	constructor(voicews, ssrc) {
		this.voicews = voicews;
		this.ssrc = ssrc;

		this.onAudioPacket = null;

		this.header = new Buffer(24);
		this.header.fill(0);
		this.header[0] = 0x80;
		this.header[1] = 0x78;
		this.header.writeUInt32BE(ssrc, 8);

		this.decryptionNonce = new Buffer(24);
		this.decryptionNonce.fill(0);

		this.reinitialize();
	}
	_encrypt(packet, nonce) {
		if (this.voicews.mode != Constants.EncryptionModes.xsalsa20_poly1305)
			return packet;

		const packetView =
			new Uint8Array(Utils.createArrayBuffer(packet));
		const nonceView =
			new Uint8Array(Utils.createArrayBuffer(nonce));

		return nacl.secret_box.pack(packetView, nonceView, this.voicews.secret);
	}
	_decrypt(packet) {
		if (this.voicews.mode != Constants.EncryptionModes.xsalsa20_poly1305)
			return packet;

		const header = packet.slice(0, 12);

		if (packet.length < 12 + 16)
			return header;

		header.copy(this.decryptionNonce);

		const audioDataView =
			new Uint8Array(Utils.createArrayBuffer(packet.slice(12)));
		const nonceView =
			new Uint8Array(Utils.createArrayBuffer(this.decryptionNonce));

		const decrypted =
			nacl.secret_box.open(audioDataView, nonceView, this.voicews.secret);

		const decryptedPacket = new Buffer(packet.length - 16);
		header.copy(decryptedPacket);
		for (let i = 0; i < decrypted.length; i++) {
			decryptedPacket[12 + i] = decrypted[i];
		}
		return decryptedPacket;
	}
	mux(packet, sampleCount) {
		this.header.writeUInt16BE(this.sequence, 2);
		this.header.writeUInt32BE(this.timestamp, 4);

		packet = this._encrypt(packet, this.header);

		const rtpPacket = new Buffer(packet.length + 12);
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
	demux(packet) {
		if (typeof this.onAudioPacket !== "function")
			return;

		try {
			packet = this._decrypt(packet);
		} catch(e) {
			return console.log(e.stack);
		}

		const seq = packet.readUInt16BE(2);
		const timestamp = packet.readUInt32BE(4);
		const ssrc = packet.readUInt32BE(8);
		const chunk = packet.slice(12);

		this.onAudioPacket({
			seq: seq,
			timestamp: timestamp,
			ssrc: ssrc,
			chunk: chunk
		});
	}
	reinitialize() {
		this.sequence = Math.round(Math.random() * 0xFFFF) - 1;
		this.timestamp = 0;
	}
}

module.exports = VoiceTransportBase;

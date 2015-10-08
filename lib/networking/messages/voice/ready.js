"use strict";

const Constants = require("../../../Constants");
const VoiceUDP = require("../../voicetransports/VoiceUDP");

module.exports = function handler(data, voicews) {
	voicews.mode = Constants.EncryptionModes.plain;

	if (data.modes.indexOf(Constants.EncryptionModes.xsalsa20_poly1305) >= 0) {
		voicews.mode = Constants.EncryptionModes.xsalsa20_poly1305;
	}

	voicews.audioTransportSocket = new VoiceUDP(voicews, data.ssrc, voicews.voiceServer, data.port);
	voicews.audioTransportSocket.onConnect = () => {
		voicews.selectProtocol(voicews.transport, {
			ip: voicews.audioTransportSocket.localip,
			port: voicews.audioTransportSocket.localport,
			mode: voicews.mode
		});
	};
	voicews.audioTransportSocket.connect();

	return true;
};

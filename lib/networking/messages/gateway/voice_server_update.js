"use strict";


module.exports = function handler(data) {
	const gw = this.gatewaySocket;
	gw.createVoiceSocket(
		data.endpoint,
		data.guild_id, gw.userId,
		gw.sessionId, data.token
	);
	return true;
};

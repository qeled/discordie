"use strict";

const Utils = require("../core/Utils");
const User = require("../models/User");
const IChannel = require("./IChannel");

// todo: multiserver voice

class IVoiceChannel extends IChannel {
	constructor(discordie, channelId) {
		super(discordie, channelId);
	}
	get members() {
		// todo: active members only?
	}
	get joined() {
		// todo: see what happens if we delete all channels with bot streaming
		return this._discordie.gatewaySocket.voiceChannelId == this.id;
	}
	join(selfMute, selfDeaf, createNewVoiceConnection) {
		const argsArray = [].slice.call(arguments);
		const args = [this.guild_id, this.id].concat(argsArray);
		this._discordie.gatewaySocket.voiceStateUpdate.apply(
			this._discordie.gatewaySocket, args
		);
	}
	leave() {
		this._discordie.gatewaySocket.disconnectVoice();
	}
}

module.exports = IVoiceChannel;

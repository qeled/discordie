"use strict";

const Utils = require("../core/Utils");
const IChannel = require("./IChannel");

const rest = require("../networking/rest");

function convertChannelToId(channel) {
	if(channel instanceof IChannel || (channel && channel.id))
		channel = channel.id;
	return channel;
}

class IInviteManager {
	constructor(discordie) {
		this._discordie = discordie;
		this._channelId = channelId;
		Utils.privatify(this);
		Object.freeze(this);
	}
	// todo: invite collection handling
	createInvite(channelId, options) {
		// todo: enforce options
		channelId = convertChannelToId;
		return rest(this._discordie).invites.createInvite(channelId, options);
	}
	revokeInvite(code) {
		return rest(this._discordie).invites.deleteInvite(code);
	}
	resolveInvite(code) {
		return rest(this._discordie).invites.getInvite(code);
	}
	acceptInvite(code) {
		return rest(this._discordie).invites.postInvite(code);
	}
}

module.exports = IInviteManager;

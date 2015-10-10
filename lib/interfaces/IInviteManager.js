"use strict";

const Utils = require("../core/Utils");

const rest = require("../networking/rest");

class IInviteManager {
	constructor(discordie) {
		this._discordie = discordie;
		Utils.privatify(this);
		Object.freeze(this);
	}
	create(channel, options) {
		options = options || {
			max_age: 60 * 30,
			// value in seconds
			max_uses: 0,
			// pretty obvious
			temporary: false,
			// temporary membership, kicks members without roles on disconnect
			xkcdpass: false
			// human readable
		};
		channel = channel.valueOf();
		return rest(this._discordie).invites.createInvite(channel, options);
	}
	regenerate(code) {
		if(code && code.code) code = code.code;
		const options = {regenerate: code};
		return rest(this._discordie).invites.createInvite(channel, options);
	}
	revoke(code) {
		if(code && code.code) code = code.code;
		return rest(this._discordie).invites.deleteInvite(code);
	}
	resolve(code) {
		if(code && code.code) code = code.code;
		return rest(this._discordie).invites.getInvite(code);
	}
	accept(code) {
		if(code && code.code) code = code.code;
		return rest(this._discordie).invites.postInvite(code);
	}
}

module.exports = IInviteManager;

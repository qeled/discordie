"use strict";

const IBase = require("./IBase");
const IUser = require("./IUser");
const Utils = require("../core/Utils");
const AuthenticatedUser = require("../models/AuthenticatedUser");

const rest = require("../networking/rest");

class IAuthenticatedUser extends IBase {
	constructor(discordie) {
		super(AuthenticatedUser, (key) => this._discordie._user[key]);
		this._discordie = discordie;
		Utils.privatify(this);
		Object.freeze(this);
	}
	isMentioned(message) {
		return IUser.prototype.isMentioned.apply(this, arguments);
	}
	get isClaimedAccount() {
		return this.email != null;
	}
	get avatarURL() {
		return IUser.prototype.getAvatarURL.apply(this, arguments);
	}
	edit(username, avatar, email, newPassword) {
		return new Promise((rs, rj) => {
			rest(this._discordie).users.me(username, avatar, email, newPassword)
			.then(() => rs(this._discordie.User))
			.catch(rj);
		});
	}
	setStatus() {

	}
}

module.exports = IAuthenticatedUser;

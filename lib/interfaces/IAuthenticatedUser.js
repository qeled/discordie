"use strict";

const IBase = require("./IBase");
const IUser = require("./IUser");
const Utils = require("../core/Utils");
const AuthenticatedUser = require("../models/AuthenticatedUser");
const Constants = require("../Constants");
const StatusTypes = Constants.StatusTypes;

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
		return Object.getOwnPropertyDescriptor(IUser.prototype, "avatarURL")
			.get.apply(this, arguments);
	}
	edit(username, avatar, email, newPassword) {
		return new Promise((rs, rj) => {
			rest(this._discordie).users.me(username, avatar, email, newPassword)
			.then(() => rs(this._discordie.User))
			.catch(rj);
		});
	}
	setStatus(status, gameId) {
		if (arguments.length == 0) return;
		if (!status) status = this.status;
		if (gameId === undefined) gameId = this.gameId;

		status = status.toLowerCase();
		const idle = (StatusTypes.IDLE.toLowerCase() == status);

		if(this._discordie._user) {
			this._discordie._user = new AuthenticatedUser(
				this._discordie._user.merge({
					status: (idle ? StatusTypes.IDLE : StatusTypes.ONLINE),
					gameId: gameId
				})
			);
		}

		this._discordie.gatewaySocket.statusUpdate(idle ? 1337 : null, gameId);
	}
	setGameId(gameId) {
		if (arguments.length == 0) return;
		this.setStatus(null, gameId);
	}
}

module.exports = IAuthenticatedUser;

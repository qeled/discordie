"use strict";

const IBase = require("./IBase");
const Utils = require("../core/Utils");
const User = require("../models/User");

class IUser extends IBase {
	constructor(discordie, userId, guildId) {
		super(User, (key) => this._discordie._users.get(this._userId)[key]);
		this._discordie = discordie;
		this._userId = userId;
		if(this.constructor.name == "IGuildMember") {
			this._guildId = guildId;
		}
		Utils.privatify(this);
		Object.freeze(this);
	}
	isMentioned(message) {
		// todo: test
		if (!(message instanceof IMessage)) {
			if (!message.id)
				return false;
			message = this._discordie.Messages.get(message);
		}

		return message.mentions.some(mention => mention.id === this.id) ||
			message.mention_everyone;
	}
	getAvatarURL() {
		return Constants.API_ENDPOINT + Constants.AVATAR(this.id, this.avatar);
	}
	getStatus() {
		return this._discordie._presences.getStatus(this.id);
	}
	getGame() {
		return this._discordie._presences.getGame(this.id);
	}
	getPreviousStatus() {
		return this._discordie._presences.getPreviousStatus(this.id);
	}
	getPreviousGame() {
		return this._discordie._presences.getPreviousGame(this.id);
	}

	get mention() {
		return `<@${this.id}>`;
	}
}

module.exports = IUser;

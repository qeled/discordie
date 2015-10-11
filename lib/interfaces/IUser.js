"use strict";

const IBase = require("./IBase");
const Utils = require("../core/Utils");
const User = require("../models/User");
const Constants = require("../Constants");

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
	get avatarURL() {
		return Constants.API_ENDPOINT + Constants.AVATAR(this.id, this.avatar);
	}
	get status() {
		return this._discordie._presences.getStatus(this.id);
	}
	get gameId() {
		return this._discordie._presences.getGame(this.id);
	}
	get previousStatus() {
		return this._discordie._presences.getPreviousStatus(this.id);
	}
	get previousGameId() {
		return this._discordie._presences.getPreviousGame(this.id);
	}

	get mention() {
		return `<@${this.id}>`;
	}
}

module.exports = IUser;

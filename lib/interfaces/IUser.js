"use strict";

const IBase = require("./IBase");
const Utils = require("../core/Utils");
const User = require("../models/User");

function convertChannelToId(channel) {
	if(channel instanceof IChannel || (channel && channel.id))
		channel = channel.id;
	return channel;
}
function convertGuildToId(guild) {
	if(guild instanceof IGuild || (guild && guild.id))
		guild = guild.id;
	return guild;
}
function convertRoleToId(role) {
	if(role instanceof IRole || (role && role.id))
		role = role.id;
	return role;
}
function convertMessageToId(message) {
	if(message instanceof IMessage || (message && message.id))
		message = message.id;
	return message;
}

class IUser extends IBase {
	constructor(discordie, userId) {
		super(User, (key) => this._discordie._users.get(this._userId)[key]);
		this._discordie = discordie;
		this._userId = userId;
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

	get mention() {
		return `<@${this.id}>`;
	}
	kick(channel) {
		channel = convertChannelToId(channel);
	}
	ban(channel, deleteMessageForDays) {
		channel = convertChannelToId(channel);
	}
	mute(channel) {
		channel = convertChannelToId(channel);
		//check mute?
	}
	unmute(channel) {
		channel = convertChannelToId(channel);

	}
	deafen(channel) {
		channel = convertChannelToId(channel);
		//check permissions?
	}
	undeafen(channel) {
		channel = convertChannelToId(channel);
		//check permissions?
	}
	isMuted(channel) {
		channel = convertChannelToId(channel);

	}
	isDeafened(channel) {
		channel = convertChannelToId(channel);

	}
	can(channel, permission) {
		channel = convertChannelToId(channel);

	}
	hasRole(guild, role) {
		guild = convertGuildToId(guild);
		role = convertRoleToId(role);
		//role->IRole
	}
}

module.exports = IUser;

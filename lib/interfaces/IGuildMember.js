"use strict";

const IBase = require("./IBase");
const IUser = require("./IUser");
const Utils = require("../core/Utils");

// todo:

class IGuildMember extends IUser {
	constructor(discordie, userId, guildId) {
		super(discordie, userId, guildId);
	}
	get guild() {
		return this._discordie.Guilds.get(this.guild_id);
	}
	get roles() {

	}
	kick() {

	}
	ban(deleteMessageForDays) {

	}
	mute() {
		//check mute?
	}
	unmute() {

	}
	deafen() {
		//check permissions?
	}
	undeafen() {
		//check permissions?
	}
	isMuted() {

	}
	isDeafened() {

	}
	can(channel, permission) {
		channel = convertChannelToId(channel);

	}
	hasRole(role) {
		role = convertRoleToId(role);
		//role->IRole
	}
}

module.exports = IGuildMember;

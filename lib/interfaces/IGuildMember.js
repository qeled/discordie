"use strict";

const IBase = require("./IBase");
const IUser = require("./IUser");
const Utils = require("../core/Utils");

const rest = require("../networking/rest");

class IGuildMember extends IUser {
	constructor(discordie, userId, guildId) {
		super(discordie, userId, guildId);
	}
	get guild() {
		return this._discordie.Guilds.get(this._guildId);
	}
	get roles() {

	}
	kick() {
		return rest(this._discordie).guilds.members.kickMember(this._guildId, this.id);
	}
	ban(deleteMessageForDays) {
		return rest(this._discordie).guilds.bans.banMember(this._guildId, this.id, deleteMessageForDays);
	}
	unban() {
		return this.guild.unban(this.id);
	}
	mute(mute) {
		//check mute?
		if(typeof mute === "undefined") mute = true;
		return rest(this._discordie).guilds.members.setMute(this._guildId, this.id, mute);
	}
	unmute() {
		this.mute(false);
	}
	deafen(deaf) {
		//check permissions?
		if(typeof deaf === "undefined") deaf = true;
		return rest(this._discordie).guilds.members.setDeaf(this._guildId, this.id, deaf);
	}
	undeafen() {
		//check permissions?
		this.deaf(false);
	}
	isMuted() {
		// todo: voice_state_update handling
		//return this._discordie._members.getMember(this._guildId, this.id).mute;
	}
	isDeafened() {
		//return this._discordie._members.getMember(this._guildId, this.id).deaf;
	}
	get joined_at() {
		return this._discordie._members.getMember(this._guildId, this.id).joined_at;
	}
	can(channel, permission) {
		channel = channel.valueOf();

	}
	hasRole(role) {
		role = role.valueOf();
		//role->IRole
	}
}

module.exports = IGuildMember;

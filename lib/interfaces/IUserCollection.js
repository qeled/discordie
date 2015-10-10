"use strict";

const Constants = require("../Constants");
const StatusTypes = Constants.StatusTypes;
const ICollectionBase = require("./ICollectionBase");
const IGuild = require("./IGuild");
const IGuildMember = require("./IGuildMember");
const IChannel = require("./IChannel");
const IUser = require("./IUser");
const Utils = require("../core/Utils");

class IUserCollection extends ICollectionBase {
	constructor(discordie, valuesGetter) {
		super({
			valuesGetter: valuesGetter,
			itemFactory: (id) => new IUser(this._discordie, id)
		});
		this._discordie = discordie;
		Utils.privatify(this);
	}
	getMember(guild, user) {
		guild = guild.valueOf();
		user = user.valueOf();
		if(!this._discordie._members.getMember(guild, user))
			return null;
		return new IGuildMember(this._discordie, user, guild);
	}
	membersForGuild(guild) {
		guild = guild.valueOf();

		const members = [];
		const guildMembers = this._discordie._members.get(guild);
		if (!guildMembers) return members;
		for(let member of guildMembers.values()) {
			members.push(new IGuildMember(this._discordie, member.id, guild));
		}
		return members;

		//return this.filter((user) =>
		//		this._discordie._presences.isUserInGuild(user.id, guildId));
		//return new IUserCollection(this._discordie,
		//	this._conditionalIterator((user) =>
		//		this._discordie._presences.isUserInGuild(user.id, guildId))
		//);
	}
	membersForChannel(channel) {
		channel = channel.valueOf();
		// todo: permission check
	}
	onlineMembersForGuild(guild) {
		guild = guild.valueOf();

		const members = [];
		const presences = this._discordie._presences;
		const guildMembers = this._discordie._members.get(guild);
		if (!guildMembers) return members;
		for(let member of guildMembers.values()) {
			if(presences.getStatus(member.id) != StatusTypes.OFFLINE)
				members.push(new IGuildMember(this._discordie, member.id, guild));
		}
		return members;

		//return this.filter((user) =>
		//		presences.isUserInGuild(user.id, guildId) &&
		//			presences.getStatus(user.id) != StatusTypes.OFFLINE);
		//return new IUserCollection(this._discordie,
		//	this._conditionalIterator((user) =>
		//		presences.isUserInGuild(user.id, guildId) &&
		//			presences.getStatus(user.id) != StatusTypes.OFFLINE)
		//);
	}
	onlineMembersForChannel(channel) {
		channel = channel.valueOf();
		// todo: permission check
	}
	offlineMembersForGuild(guild) {
		guild = guild.valueOf();

		const members = [];
		const presences = this._discordie._presences;
		const guildMembers = this._discordie._members.get(guild);
		if (!guildMembers) return members;
		for(let member of guildMembers.values()) {
			if (presences.getStatus(member.id) == StatusTypes.OFFLINE)
				members.push(new IGuildMember(this._discordie, member.id, guild));
		}
		return members;

		//return this.filter((user) =>
		//		presences.isUserInGuild(user.id, guildId) &&
		//			presences.getStatus(user.id) == StatusTypes.OFFLINE);
		//return new IUserCollection(this._discordie,
		//	this._conditionalIterator((user) =>
		//		presences.isUserInGuild(user.id, guildId) &&
		//			presences.getStatus(user.id) == StatusTypes.OFFLINE)
		//);
	}
	offlineMembersForChannel(channel) {
		channel = channel.valueOf();
		// todo: permission check
	}
}

module.exports = IUserCollection;

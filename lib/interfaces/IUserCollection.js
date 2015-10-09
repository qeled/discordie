"use strict";

const Constants = require("../Constants");
const StatusTypes = Constants.StatusTypes;
const ICollectionBase = require("./ICollectionBase");
const IGuild = require("./IGuild");
const IGuildMember = require("./IGuildMember");
const IChannel = require("./IChannel");
const IUser = require("./IUser");
const Utils = require("../core/Utils");

function convertUserToId(user) {
	if(user instanceof IUser || (user && user.id))
		user = user.id;
	return user;
}
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
		guild = convertGuildToId(guild);
		user = convertUserToId(user);
		if(!this._discordie._members.getMember(guild, user))
			return null;
		return new IGuildMember(this._discordie, user, guild);
	}
	membersForGuild(guild) {
		guild = convertGuildToId(guild);

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
		channel = convertChannelToId(channel);
		// todo: permission check
	}
	onlineMembersForGuild(guild) {
		guild = convertGuildToId(guild);

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
		channel = convertChannelToId(channel);
		// todo: permission check
	}
	offlineMembersForGuild(guild) {
		guild = convertGuildToId(guild);

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
		channel = convertChannelToId(channel);
		// todo: permission check
	}
}

module.exports = IUserCollection;

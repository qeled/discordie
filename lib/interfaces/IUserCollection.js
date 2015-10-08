"use strict";

const Constants = require("../Constants");
const StatusTypes = Constants.StatusTypes;
const ICollectionBase = require("./ICollectionBase");
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
	getMembersInGuild(guildId) {
		if(guildId instanceof IGuild || (guildId && guildId.id))
			guildId = guildId.id;

		return this.filter((user) =>
				this._discordie._presences.isUserInGuild(user.id, guildId));
		//return new IUserCollection(this._discordie,
		//	this._conditionalIterator((user) =>
		//		this._discordie._presences.isUserInGuild(user.id, guildId))
		//);
	}
	getMembersInChannel(channelId) {
		if(channelId instanceof IGuild || (channelId && channelId.id))
			channelId = channelId.id;
		// todo: permission check
	}
	getOnlineMembersInGuild(guildId) {
		if(guildId instanceof IGuild || (guildId && guildId.id))
			guildId = guildId.id;

		const presences = this._discordie._presences;
		return this.filter((user) =>
				presences.isUserInGuild(user.id, guildId) &&
					presences.getStatus(user.id) != StatusTypes.OFFLINE);
		//return new IUserCollection(this._discordie,
		//	this._conditionalIterator((user) =>
		//		presences.isUserInGuild(user.id, guildId) &&
		//			presences.getStatus(user.id) != StatusTypes.OFFLINE)
		//);
	}
	getMembersUsersInChannel(channelId) {
		if(channelId instanceof IGuild || (channelId && channelId.id))
			channelId = channelId.id;
		// todo: permission check
	}
	getOfflineMembersInGuild(guildId) {
		if(guildId instanceof IGuild || (guildId && guildId.id))
			guildId = guildId.id;

		const presences = this._discordie._presences;
		return this.filter((user) =>
				presences.isUserInGuild(user.id, guildId) &&
					presences.getStatus(user.id) == StatusTypes.OFFLINE);
		//return new IUserCollection(this._discordie,
		//	this._conditionalIterator((user) =>
		//		presences.isUserInGuild(user.id, guildId) &&
		//			presences.getStatus(user.id) == StatusTypes.OFFLINE)
		//);
	}
	getOfflineMembersInChannel(channelId) {
		if(channelId instanceof IGuild || (channelId && channelId.id))
			channelId = channelId.id;
		// todo: permission check
	}
}

module.exports = IUserCollection;

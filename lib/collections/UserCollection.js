"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");

const User = require("../models/User");
const AuthenticatedUser = require("../models/AuthenticatedUser");

function handleConnectionOpen(data) {
	this.clear();
	this.set(data.user.id, new AuthenticatedUser(data.user));

	data.guilds.forEach(guild => {
		if(guild.unavailable) return;
		guild.members.forEach(member => {
			if(member.user.id == data.user.id) return;
			this.set(member.user.id, new User(member.user));
		});
	});

	data.private_channels.forEach(channel => {
		if(!channel.recipient) return;
		this.set(channel.recipient.id, channel.recipient);
	});

	return true;
}

function handleUpdateUser(user) {
	const cachedUser = this.discordie._user;
	this.discordie._user = new AuthenticatedUser(
		cachedUser ? cachedUser.merge(user) : user
	);
	this.mergeOrSet(user.id, this.discordie._user);
	return true;
}

function handleLoadedMoreMessages(e) {
	e.messages.forEach(message => {
		this.mergeOrSet(message.author.id, new User(message.author));
		message.mentions.forEach(mention => {
			this.mergeOrSet(mention.id, new User(mention));
		});
	});
	return true;
}

function handleIncomingMessage(message) {
	if (message.author) {
		this.mergeOrSet(message.author.id, new User(message.author));
	}
	if (message.mentions) {
		message.mentions.forEach(mention => {
			this.mergeOrSet(mention.id, new User(mention));
		});
	}
	return true;
}

function handleCreateOrUpdateChannel(channel) {
	if (channel.recipient) {
		this.mergeOrSet(channel.recipient.id, new User(channel.recipient));
	}
	return true;
}

function handlePresenceUpdate(presence) {
	const cachedUser = this.get(presence.user.id);
	if (!cachedUser) return true;

	const replacer = (hasChanges, key) => {
		if (presence.user.hasOwnProperty(key)) {
			hasChanges = hasChanges ||
				(cachedUser[key] != presence.user[key]);
		}
		return hasChanges;
	};
	const hasChanges =
		["username", "avatar", "discriminator"].reduce(replacer, false);

	if (hasChanges)
		this.mergeOrSet(cachedUser.id, new User(presence.user));

	return true;
}

/*function handleLoadedGuildBans(data) {
	data.bans.forEach(ban => {
		this.mergeOrSet(ban.user.id, new User(ban.user));
	});
}*/

function handleBanOrMember(member) {
	this.mergeOrSet(member.user.id, new User(member.user));
	return true;
}

function handleGuildCreate(guild) {
	guild.members.forEach(member => {
		if(this._discordie._user.id == member.user.id) return;
		this.mergeOrSet(member.user.id, new User(member.user));
	});
	return true;
}

class UserCollection extends BaseCollection {
	constructor(discordie, gateway) {
		super();

		if(typeof gateway !== "function")
			throw new Error("Gateway parameter must be a function");

		discordie.Dispatcher.on(Events.GATEWAY_READY, e => {
			if(e.socket != gateway()) return;
			(handleConnectionOpen.bind(this))(e.data);
		});
		discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
			if(e.socket != gateway()) return;

			Utils.bindGatewayEventHandlers(this, e, {
				USER_UPDATE: handleUpdateUser,
				PRESENCE_UPDATE: handlePresenceUpdate,
				MESSAGE_CREATE: handleIncomingMessage,
				GUILD_CREATE: handleGuildCreate,
				GUILD_BAN_ADD: handleBanOrMember,
				GUILD_BAN_REMOVE: handleBanOrMember,
				GUILD_MEMBER_ADD: handleBanOrMember,
				GUILD_MEMBER_REMOVE: handleBanOrMember,
				CHANNEL_CREATE: handleCreateOrUpdateChannel,
				CHANNEL_UPDATE: handleCreateOrUpdateChannel
			});
		});

		discordie.Dispatcher.on(Events.LOADED_MORE_MESSAGES,
			handleLoadedMoreMessages.bind(this));

		// todo: Events.LOADED_GUILD_BANS: handleLoadedGuildBans

		this._discordie = discordie;
		Utils.privatify(this);
	}
	updateAuthenticatedUser(user) {
		handleUpdateUser.call(this, user);
	}
	update(user) {
		this.mergeOrSet(user.id, new User(user));
	}
}

module.exports = UserCollection;

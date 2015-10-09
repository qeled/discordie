"use strict";

const Constants = require("../Constants");

const IBase = require("./IBase");
const Utils = require("../core/Utils");
const Guild = require("../models/Guild");

const rest = require("../networking/rest");

class IGuild extends IBase {
	constructor(discordie, guildId) {
		super(Guild, (key) => this._discordie._guilds.get(this._guildId)[key]);
		this._discordie = discordie;
		this._guildId = guildId;
		Utils.privatify(this);
		Object.freeze(this);
	}
	get acronym() {
		return this.name && this.name.replace(/\w+/g, match => match[0]).replace(/\s/g, "");
	}
	getIconURL() {
		return Constants.API_ENDPOINT + Constants.GUILD_ICON(this.id, this.icon);
	}
	isOwner(user) {
		// todo: test .equals
		if(user) return this.owner.equals(user);
		return false;
	}

	get afk_channel() {
		if(!this.afk_channel_id)
			return null;
		const afk_channel = this._discordie.Channels.get(this.afk_channel_id);
		return afk_channel ? afk_channel : null;
	}
	get owner() {
		if(!this.owner_id)
			return null;
		const owner = this._discordie.Users.get(this.owner_id);
		return owner ? owner : null;
	}

	get channels() {
		return this._discordie.Channels.forGuild(this.id);
	}
	get textChannels() {
		return this._discordie.Channels.textForGuild(this.id);
	}
	get voiceChannels() {
		return this._discordie.Channels.voiceForGuild(this.id);
	}

	createChannel(type, name) {
		return new Promise((rs, rj) => {
			rest(this._discordie).channels.createChannel(this.id, type, name)
			.then((channel) => rs(this._discordie.Channels.get(channel.id)))
			.catch(rj);
		});
	}
	get roles() {

	}
	get members() {
		return this._discordie.Users.membersForGuild(this.id);
	}
	delete() {
		// todo: check permissions
		return rest(this._discordie).guilds.deleteGuild(this.id);
	}

	unban(userId) {

	}
	getBans() {
		// todo: ban management?
	}
}

module.exports = IGuild;

"use strict";

const IBase = require("./IBase");
const Utils = require("../core/Utils");
const Channel = require("../models/Channel");
const IUser = require("./IUser");

const rest = require("../networking/rest");

class IChannel extends IBase {
	constructor(discordie, channelId) {
		super(Channel, (key) => this._discordie._channels.get(this._channelId)[key]);
		this._discordie = discordie;
		this._channelId = channelId;
		Utils.privatify(this);
		Object.freeze(this);
	}
	get guild() {
		return this._discordie.Guilds.get(this.guild_id);
	}
	update(name, position, topic) {
		if (typeof name !== "string") name = this.name;
		if (typeof position !== "number") position = this.position;
		if (typeof topic !== "string") topic = this.topic;
		return new Promise((rs, rj) => {
			rest(this._discordie).channels.patchChannel(this.id, name, position, topic)
			.then((channel) => rs(this._discordie.Channels.get(channel.id)))
			.catch(rj);
		});
	}


	delete() {
		//todo: check permissions
		return rest(this._discordie).channels.deleteChannel(this.id);
	}

	// todo: wrap this around some IChannelPermission?
	//updatePermissionOverwrite(overwrite) {
	//	return rest(this._discordie).channels.putPermissionOverwrite(this.id, overwrite);
	//}
	//clearPermissionOverwrite(overwriteId) {
	//	return rest(this._discordie).channels.deletePermissionOverwrite(this.id, overwriteId);
	//}
}

module.exports = IChannel;

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
	update(data) {
		// todo: patch channel? setTopic/setName/setPosition?
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

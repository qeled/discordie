"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

const BaseGuildMember = {
	id: null,
	guild_id: null,
	roles: new Map(),
	mute: false,
	deaf: false,
	joined_at: new Date()
};

class GuildMember extends BaseModel {
	constructor(def) {
		super(BaseGuildMember, def);
	}
}

module.exports = GuildMember;

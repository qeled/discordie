"use strict";

const Constants = require("../Constants");
const StatusTypes = Constants.StatusTypes;
const BaseModel = require("./BaseModel");

const BaseAuthenticatedUser = {
	id: null,
	username: "",
	discriminator: null,
	email: null,
	verified: false,
	status: StatusTypes.ONLINE,
	avatar: null,
	token: null,

	gameId: null // clientside cache
};

class AuthenticatedUser extends BaseModel {
	constructor(def) {
		super(BaseAuthenticatedUser, def);
	}
}

module.exports = AuthenticatedUser;

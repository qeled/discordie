"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

const BaseUser = {
	id: null,
	username: "",
	discriminator: null,
	email: null,
	verified: false,
	status: null,
	avatar: null,
	token: null
};

class User extends BaseModel {
	constructor(def) {
		super(BaseUser, def);
	}
}

module.exports = User;

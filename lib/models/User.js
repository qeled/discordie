"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

const BaseUser = {
  id: null,
  username: "",
  discriminator: null,
  avatar: null,
};

class User extends BaseModel {
  constructor(def) {
    super(BaseUser, def);
  }
}

module.exports = User;

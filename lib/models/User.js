"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

/**
 * @kind model
 * @alias User
 */
const BaseUser = {
  /** @returns {String|null} */
  id: null,
  /** @returns {String|null} */
  username: "",
  /** @returns {String|null} */
  discriminator: null,
  /** @returns {String|null} */
  avatar: null,
  /** @returns {boolean|null} */
  bot: false,
};

class User extends BaseModel {
  constructor(def) {
    super(BaseUser, def);
  }
}

module.exports = User;

"use strict";

const Constants = require("../Constants");
const StatusTypes = Constants.StatusTypes;
const BaseModel = require("./BaseModel");

/**
 * @kind model
 * @alias AuthenticatedUser
 */
const BaseAuthenticatedUser = {
  /** @returns {String|null} */
  id: null,
  /** @returns {String|null} */
  username: "",
  /** @returns {String|null} */
  discriminator: null,
  /** @returns {String|null} */
  email: null,
  /** @returns {boolean|null} */
  verified: false,
  /** @returns {String|null} */
  status: StatusTypes.ONLINE,
  /** @returns {String|null} */
  avatar: null,
  /** @returns {String|null} */
  token: null,
  /** @returns {boolean|null} */
  bot: false,
  /** @returns {boolean|null} */
  mfa_enabled: false,
  /** @returns {Object|null} */
  game: null, // clientside cache
  /** @returns {boolean|null} */
  afk: false // clientside cache
};

class AuthenticatedUser extends BaseModel {
  constructor(def) {
    super(BaseAuthenticatedUser, def);
  }
}

module.exports = AuthenticatedUser;

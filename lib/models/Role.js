"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

/**
 * @kind model
 * @alias Role
 */
const BaseRole = {
  /** @returns {String|null} */
  id: null,
  /** @returns {String|null} */
  name: null,
  /** @returns {Number|null} */
  permissions: 0,
  /** @returns {boolean|null} */
  mentionable: false,
  /** @returns {Number|null} */
  position: -1,
  /** @returns {boolean|null} */
  hoist: false,
  /** @returns {Number|null} */
  color: 0,
  /** @returns {boolean|null} */
  managed: false
};

class Role extends BaseModel {
  constructor(def) {
    super(BaseRole, def);
  }
}

module.exports = Role;

"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

/**
 * @kind model
 * @alias PermissionOverwrite
 */
const BasePermissionOverwrite = {
  /** @returns {String|null} */
  id: null,
  /** @returns {String|null} */
  type: null,
  /** @returns {Number|null} */
  allow: 0,
  /** @returns {Number|null} */
  deny: 0
};

class PermissionOverwrite extends BaseModel {
  constructor(def) {
    super(BasePermissionOverwrite, def);
  }
}

module.exports = PermissionOverwrite;

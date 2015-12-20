"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

/**
 * @kind model
 * @alias GuildMember
 */
const BaseGuildMember = {
  /** @returns {String|null} */
  id: null,
  /** @returns {String|null} */
  guild_id: null,
  /** @returns {Array|null} */
  roles: [],
  /** @returns {Boolean|null} */
  mute: false,
  /** @returns {Boolean|null} */
  deaf: false,
  /** @returns {Boolean|null} */
  joined_at: ""
};

class GuildMember extends BaseModel {
  constructor(def) {
    super(BaseGuildMember, def);
  }
}

module.exports = GuildMember;

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
  /** @returns {String|null} */
  nick: null,
  /** @returns {Array|null} */
  roles: [],
  /** @returns {boolean|null} */
  mute: false,
  /** @returns {boolean|null} */
  deaf: false,
  /** @returns {boolean|null} */
  self_mute: false,
  /** @returns {boolean|null} */
  self_deaf: false,
  /** @returns {String|null} */
  joined_at: ""
};

class GuildMember extends BaseModel {
  constructor(def) {
    super(BaseGuildMember, def);
  }
}

module.exports = GuildMember;

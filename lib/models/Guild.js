"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

/**
 * @kind model
 * @alias Guild
 */
const BaseGuild = {
  /** @returns {String|null} */
  id: null,
  /** @returns {String|null} */
  name: null,
  /** @returns {String|null} */
  owner_id: null,
  /** @returns {String|null} */
  icon: null,
  /** @returns {String|null} */
  splash: null,
  /** @returns {Set|null} */
  features: new Set(),
  /** @returns {Array<Object>|null} */
  emojis: [],
  /** @returns {Number|null} */
  default_message_notifications: 0,
  /** @returns {Map|null} */
  roles: new Map(),
  /** @returns {String|null} */
  afk_channel_id: null,
  /** @returns {Number|null} */
  explicit_content_filter: 0,
  /** @returns {Number|null} */
  afk_timeout: null,
  /** @returns {Number|null} */
  verification_level: 0,
  /** @returns {String|null} */
  region: null,
  /** @returns {Number|null} */
  member_count: 0,
  /** @returns {Boolean|null} */
  large: false,
  /** @returns {Number|null} */
  mfa_level: 0,
  /** @returns {String|null} */
  joined_at: ""
};

class Guild extends BaseModel {
  constructor(def) {
    super(BaseGuild, def);
  }
}

module.exports = Guild;

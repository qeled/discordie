"use strict";

const Constants = require("../Constants");
const ChannelTypes = Constants.ChannelTypes;
const BaseModel = require("./BaseModel");

/**
 * @kind model
 * @alias Channel
 */
const BaseChannel = {
  /** @returns {String|null} */
  id: null,
  /** @returns {String|null} */
  name: "<not initialized>",
  /** @returns {String|null} */
  topic: "",
  /** @returns {Number|null} */
  position: 0,
  /** @returns {Number|null} */
  type: ChannelTypes.GUILD_TEXT,
  /** @returns {String|null} */
  guild_id: null,
  /** @returns {Set|null} */
  recipients: new Set(),
  /** @returns {Array|null} */
  permission_overwrites: [],
  /** @returns {Number|null} */
  bitrate: 0,
  /** @returns {Number|null} */
  user_limit: 0,
  /** @returns {String|null} */
  owner_id: null,
  /** @returns {String|null} */
  icon: null
};

class Channel extends BaseModel {
  constructor(def) {
    super(BaseChannel, def);
  }
}

module.exports = Channel;

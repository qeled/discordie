"use strict";

const Constants = require("../Constants");
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
  /** @returns {boolean|null} */
  is_private: false,
  /** @returns {String|null} */
  type: "text",
  /** @returns {String|null} */
  guild_id: null,
  /** @returns {String|null} */
  recipient_id: null,
  /** @returns {Array|null} */
  permission_overwrites: [],
  /** @returns {Number|null} */
  bitrate: 0
};

class Channel extends BaseModel {
  constructor(def) {
    super(BaseChannel, def);
  }
}

module.exports = Channel;

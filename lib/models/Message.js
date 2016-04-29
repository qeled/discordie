"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

/**
 * @kind model
 * @alias Message
 */
const BaseMessage = {
  /** @returns {String|null} */
  id: null,
  /** @returns {String|null} */
  channel_id: null,
  /** @returns {User|null} */
  author: null,
  /** @returns {String|null} */
  content: "",
  /** @returns {Array|null} */
  attachments: [],
  /** @returns {Array|null} */
  embeds: [],
  /** @returns {Array|null} */
  mentions: [],
  /** @returns {Array|null} */
  mention_roles: [],
  /** @returns {boolean|null} */
  mention_everyone: false,
  /** @returns {null} */
  via: null,
  /** @returns {boolean|null} */
  tts: false,
  /** @returns {Array|null} */
  invites: [],
  /** @returns {String|null} */
  timestamp: "",
  /** @returns {String|null} */
  edited_timestamp: null,
  /** @returns {String|null} */
  nonce: null,

  /** @returns {boolean|null} */
  deleted: false // for clientside cache
};

class Message extends BaseModel {
  constructor(def) {
    super(BaseMessage, def);
  }
}

module.exports = Message;

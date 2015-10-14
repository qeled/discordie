"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

const BaseMessage = {
  id: null,
  channel_id: null,
  author: null,
  content: "",
  attachments: [],
  embeds: [],
  mentions: [],
  mention_everyone: false,
  via: null,
  tts: false,
  invites: [],
  timestamp: Date.now(),
  edited_timestamp: null,
  nonce: null,

  deleted: false // for clientside cache
};

class Message extends BaseModel {
  constructor(def) {
    super(BaseMessage, def);
  }
}

module.exports = Message;

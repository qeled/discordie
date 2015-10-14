"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

const BaseChannel = {
  id: null,
  name: "<unknown>",
  topic: "",
  position: 0,
  is_private: false,
  type: "text",
  guild_id: null,
  recipient_id: null,
  permission_overwrites: {}
};

class Channel extends BaseModel {
  constructor(def) {
    super(BaseChannel, def);
  }
}

module.exports = Channel;

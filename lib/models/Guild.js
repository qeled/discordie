"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

const BaseGuild = {
  id: null,
  name: null,
  owner_id: null,
  icon: null,
  roles: new Map(),
  afk_channel_id: null,
  afk_timeout: null,
  region: null,
  joined_at: new Date()
};

class Guild extends BaseModel {
  constructor(def) {
    super(BaseGuild, def);
  }
}

module.exports = Guild;

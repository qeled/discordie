"use strict";

const IBase = require("./IBase");
const Utils = require("../core/Utils");

// todo:

const BaseRole = {
  permissions: 0,
  name: "",
  id: null
};

class IRole {
  constructor(discordie, roleId, guildId) {
    super(BaseRole, (key) => {
      const guild = this._discordie._guilds.get(this._guildId);
      if (!guild) return null;
      const role = role[this._roleId];
      if (!role) return null;
      return role[key];
    });
    this._discordie = discordie;
    this._roleId = roleId;
    this._guildId = guildId;
    Utils.privatify(this);
    Object.freeze(this);
  }
}

module.exports = IRole;

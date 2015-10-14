"use strict";

const IBase = require("./IBase");
const Utils = require("../core/Utils");
const Role = require("../models/Role");

class IRole extends IBase {
  constructor(discordie, roleId, guildId) {
    super(Role, (key) => {
      const guild = this._discordie._guilds.get(this._guildId);
      if (!guild) return null;
      const role = guild.roles.get(this._roleId);
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

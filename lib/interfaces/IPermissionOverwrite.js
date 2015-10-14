"use strict";

const IBase = require("./IBase");
const Utils = require("../core/Utils");
const PermissionOverwrite = require("../models/PermissionOverwrite");

class IPermissionOverwrite extends IBase {
  constructor(discordie, overwriteId, channelId) {
    super(PermissionOverwrite, (key) => {
      const channel = this._discordie._channels.get(this._channelId);
      if (!channel) return null;
      const overwrite = channel.permission_overwrites.get(this._overwriteId);
      if (!overwrite) return null;
      return overwrite[key];
    });
    this._discordie = discordie;
    this._overwriteId = overwriteId;
    this._channelId = channelId;
    Utils.privatify(this);
    Object.freeze(this);
  }
}

module.exports = IRole;

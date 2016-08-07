"use strict";

const IBase = require("./IBase");
const IPermissions = require("./IPermissions");
const Utils = require("../core/Utils");
const PermissionOverwrite = require("../models/PermissionOverwrite");

const Constants = require("../Constants");
const ChannelTypes = Constants.ChannelTypes;
const PermissionSpecs = Constants.PermissionSpecs;

const rest = require("../networking/rest");

/**
 * @interface
 * @model PermissionOverwrite
 * @extends IBase
 */
class IPermissionOverwrite extends IBase {
  constructor(discordie, overwriteId, channelId) {
    super();
    this._discordie = discordie;
    this._overwriteId = overwriteId;
    this._channelId = channelId;

    const channel = discordie._channels.get(channelId) || {};

    const spec = (channel.type == ChannelTypes.GUILD_VOICE ?
      PermissionSpecs.VoiceChannel :
      PermissionSpecs.TextChannel
    );
    this._allow = new IPermissions(this.getRaw().allow, spec);
    this._deny = new IPermissions(this.getRaw().deny, spec);

    Utils.privatify(this);

    Object.freeze(this);
  }

  /**
   * Gets date and time the member or role of this overwrite was created at.
   * @returns {Date}
   * @readonly
   * @ignore
   */
  get createdAt() {
    return new Date(Utils.timestampFromSnowflake(this.id));
  }

  /**
   * Loads original permissions from cache and updates this object.
   */
  reload() {
    const raw = this.getRaw();
    if (!raw) return;
    this._allow.raw = raw.allow;
    this._deny.raw = raw.deny;
  }

  /**
   * Makes a request to commit changes made to this permission overwrite object.
   * @returns {Promise<IPermissionOverwrite, Error>}
   */
  commit() {
    return new Promise((rs, rj) => {
      const raw = this.getRaw();
      raw.allow = this._allow.raw;
      raw.deny = this._deny.raw;

      rest(this._discordie)
        .channels.putPermissionOverwrite(this._channelId, raw)
      .then(() => rs(this))
      .catch(e => {
        this.reload();
        return rj(e);
      });
    });
  }

  /**
   * Makes a request to delete this permission overwrite.
   * @returns {Promise}
   */
  delete() {
    return rest(this._discordie)
      .channels.deletePermissionOverwrite(this._channelId, this.id);
  }
}

IPermissionOverwrite._inherit(PermissionOverwrite, function(key) {
  const channel = this._discordie._channels.get(this._channelId);
  if (!channel) return null;
  const overwrite = channel.permission_overwrites
    .find(o => o.id == this._overwriteId);
  if (!overwrite) return null;
  return overwrite[key];
});

/**
 * @readonly
 * @instance
 * @memberOf IPermissionOverwrite
 * @name allow
 * @returns {IPermissions}
 */
IPermissionOverwrite._setValueOverride("allow", function(v) {
  return this._allow;
});

/**
 * @readonly
 * @instance
 * @memberOf IPermissionOverwrite
 * @name deny
 * @returns {IPermissions}
 */
IPermissionOverwrite._setValueOverride("deny", function(v) {
  return this._deny;
});

module.exports = IPermissionOverwrite;

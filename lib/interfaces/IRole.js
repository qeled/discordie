"use strict";

const IBase = require("./IBase");
const IPermissions = require("./IPermissions");
const Utils = require("../core/Utils");
const Role = require("../models/Role");

const Constants = require("../Constants");
const PermissionSpecs = Constants.PermissionSpecs;

const rest = require("../networking/rest");

/**
 * @interface
 */
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
    this._permissions = new IPermissions(
      this.getRaw().permissions,
      PermissionSpecs.Role
    );
    Utils.privatify(this);

    /**
     * @readonly
     * @instance
     * @memberOf IRole
     * @name permissions
     * @returns {IPermissions}
     */
    this._setValueOverride("permissions", (v) => this._permissions);

    Object.freeze(this);
  }
  reload() {
    const raw = this.getRaw();
    if (!raw) return;
    this._permissions.raw = raw.permissions;
  }
  commit(name, color, hoist) {
    const everyone = (this.id == this._guildId);
    if (!name || everyone) name = this.name;
    if (hoist === undefined || hoist === null || everyone) hoist = this.hoist;
    if (color === undefined || color === null || everyone) color = this.color;

    return new Promise((rs, rj) => {
      rest(this._discordie).guilds.roles.patchRole(
        this._guildId, this.id,
        name, this.permissions.raw, color, hoist
      )
      .then(() => rs(this))
      .catch(err => {
        this.reload();
        return rj(err);
      });
    });
  }
  /**
   * Moves this role to `position` and makes a batch role update request.
   * @param {Number} position
   * @returns {Promise}
   */
  setPosition(position) {
    const guild = this._discordie.Guilds.get(this._guildId);
    if (!guild) return Promise.reject(new Error("Guild does not exist"));

    // maybe todo: disallow assigning position 0 (role @everyone)
    const changes = Utils.reorderObjects(guild.roles, this, position);
    if (!changes) return Promise.resolve();

    return rest(this._discordie)
      .guilds.roles.batchPatchRoles(this._guildId, changes);
  }
  delete() {
    return rest(this._discordie)
      .guilds.roles.deleteRole(this._guildId, this.id);
  }
}

module.exports = IRole;

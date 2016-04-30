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
 * @extends IBase
 * @model Role
 */
class IRole extends IBase {
  constructor(discordie, roleId, guildId) {
    super();
    Utils.definePrivate(this, {
      _discordie: discordie,
      _roleId: roleId,
      _guildId: guildId
    });
    Utils.definePrivate(this, {
      _permissions: new IPermissions(
        this.getRaw("permissions"),
        PermissionSpecs.Role
      )
    });

    Object.freeze(this);
  }

  /**
   * Creates a mention from this role's id.
   * @returns {String}
   * @readonly
   * @example
   * channel.sendMessage(role.mention + ", example mention");
   */
  get mention() {
    return `<@&${this.id}>`;
  }

  /**
   * Loads original permissions from cache and updates this object.
   */
  reload() {
    const rawPermissions = this.getRaw("permissions");
    if (!rawPermissions) return;
    this._permissions.raw = rawPermissions;
  }

  /**
   * Makes a request to commit changes made to this role object.
   * @param {String} [name]
   * @param {Number} [color] - RGB color number
   * @param {boolean} [hoist] - true if role should be displayed separately
   * @param {boolean} [mentionable]
   * @returns {Promise}
   */
  commit(name, color, hoist, mentionable) {
    const everyone = (this.id == this._guildId);
    if (!name || everyone) name = this.name;
    if (hoist === undefined || hoist === null || everyone) hoist = this.hoist;
    if (color === undefined || color === null || everyone) color = this.color;
    if (mentionable === undefined || mentionable === null || everyone) {
      mentionable = this.mentionable;
    }

    return new Promise((rs, rj) => {
      rest(this._discordie).guilds.roles.patchRole(
        this._guildId, this.id,
        name, this.permissions.raw, color, hoist, mentionable
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

  /**
   * Makes a request to delete this role.
   * @returns {Promise}
   */
  delete() {
    return rest(this._discordie)
      .guilds.roles.deleteRole(this._guildId, this.id);
  }
}

IRole._inherit(Role, function modelPropertyGetter(key) {
  const guild = this._discordie._guilds.get(this._guildId);
  if (!guild) return null;
  const role = guild.roles.get(this._roleId);
  if (!role) return null;
  return role[key];
});

/**
 * @readonly
 * @instance
 * @memberOf IRole
 * @name permissions
 * @returns {IPermissions}
 */
IRole._setValueOverride("permissions", function(v) {
  return this._permissions;
});

module.exports = IRole;

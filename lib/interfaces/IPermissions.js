"use strict";

const Constants = require("../Constants");
const Permissions = Constants.Permissions;
const PermissionsDefault = Constants.PermissionsDefault;

/**
 * @interface
 */
class IPermissions {
  constructor(raw, permissionSpec) {
    this.raw = raw || 0;
    for (let type in permissionSpec) {
      this[type] = {};
      for (let permission in permissionSpec[type]) {
        const bit = permissionSpec[type][permission];
        Object.defineProperty(this[type], permission, {
          enumerable: true,
          get: () => (this.raw & bit) === bit,
          set: (v) => v ? (this.raw |= bit) : (this.raw &= ~bit)
        });
      }
      Object.seal(this[type]);
    }
    Object.seal(this);
  }
  setAll() { this.raw = IPermissions.ALL; }
  unsetAll() { this.raw = IPermissions.NONE; }

  static get ALL() { return (~0 >>> 0); }
  static get DEFAULT() { return PermissionsDefault; }
  static get NONE() { return 0; }

  static resolveRaw(user, context) {
    // referencing here to avoid circular require()
    const IUser = require("./IUser");
    const IAuthenticatedUser = require("./IAuthenticatedUser");
    const IChannel = require("./IChannel");
    const IGuild = require("./IGuild");
    const IGuildMember = require("./IGuildMember");

    if (!(user instanceof IUser) && !(user instanceof IAuthenticatedUser))
      throw new TypeError("user must be an instance of IUser");
    if (!(context instanceof IChannel) && !(context instanceof IGuild))
      throw new TypeError("context must be an instance of IChannel or IGuild");

    if (!context._valid) throw new Error("Invalid context");

    let overwrites = null;
    if (context instanceof IChannel) {
      overwrites = context.getRaw().permission_overwrites;
      context = context.guild;
    }

    if (context.isOwner(user))
      return IPermissions.ALL;

    const member = user instanceof IGuildMember ?
      user : context._discordie.Users.getMember(context.id, user.id);

    if (!member) throw new Error("Invalid user");

    const contextRaw = context.getRaw();
    const roleEveryone = contextRaw ? contextRaw.roles.get(context.id) : null;

    // apply default permissions
    let permissions = roleEveryone ?
      roleEveryone.permissions : IPermissions.DEFAULT;

    // then roles assigned for member
    const memberRoles = member ? member.roles : null;
    if (memberRoles) {
      permissions = memberRoles.reduce(
        (ps, role) => ps | role.permissions.raw,
        permissions
      );
    }

    if (overwrites) {
      const applyOverwrite = (overwrite) => {
        if (!overwrite) return;
        permissions &= ~overwrite.deny;
        permissions |= overwrite.allow;
      };

      // then channel specific @everyone role
      const overwriteEveryone = overwrites.find(o => o.id == context.id);
      applyOverwrite(overwriteEveryone);

      if (member) {
        // then member roles for channel
        if (memberRoles)
          memberRoles.forEach(role =>
            applyOverwrite(overwrites.find(o => o.id == role.id))
          );

        // then member specific permissions for channel
        const overwriteMember = overwrites.find(o => o.id == member.id);
        applyOverwrite(overwriteMember);
      }
    }

    if (permissions & Permissions.General.MANAGE_ROLES)
      return IPermissions.ALL;

    return permissions;
  }

  static resolve(user, context) {
    return new IPermissions(
      IPermissions.resolveRaw(user, context),
      Permissions
    );
  }
}

module.exports = IPermissions;

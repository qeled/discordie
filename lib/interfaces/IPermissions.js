"use strict";

const Constants = require("../Constants");
const Permissions = Constants.Permissions;
const PermissionsDefault = Constants.PermissionsDefault;

/**
 * @interface
 * @description
 * Wrapper for numeric permission values.
 *
 * Contains boolean getters/setters (different for roles and channels).
 *
 * - `.Text` section only exists for text channels;
 * - `.Voice` section only exists for voice channels;
 * - `.General` section exists for both;
 * - Roles contain all properties - both `.Text` and `.Voice` sections.
 *
 * Example of role permission properties:
 * ```
 * General: {
 *   CREATE_INSTANT_INVITE,
 *   KICK_MEMBERS,
 *   BAN_MEMBERS,
 *   ADMINISTRATOR,
 *   MANAGE_CHANNELS,
 *   MANAGE_GUILD,
 *   CHANGE_NICKNAME,
 *   MANAGE_NICKNAMES,
 *   MANAGE_ROLES,
 *   MANAGE_WEBHOOKS,
 *   MANAGE_EMOJIS,
 * },
 * Text: {
 *   READ_MESSAGES,
 *   SEND_MESSAGES,
 *   SEND_TTS_MESSAGES,
 *   MANAGE_MESSAGES,
 *   EMBED_LINKS,
 *   ATTACH_FILES,
 *   READ_MESSAGE_HISTORY,
 *   MENTION_EVERYONE,
 *   EXTERNAL_EMOTES,
 *   ADD_REACTIONS,
 * },
 * Voice: {
 *   CONNECT,
 *   SPEAK,
 *   MUTE_MEMBERS,
 *   DEAFEN_MEMBERS,
 *   MOVE_MEMBERS,
 *   USE_VAD,
 * }
 * ```
 *
 * Example of text channel permission properties:
 * ```
 * General: {
 *   CREATE_INSTANT_INVITE,
 *   MANAGE_CHANNEL,
 *   MANAGE_PERMISSIONS
 * },
 * Text: {
 *   READ_MESSAGES,
 *   SEND_MESSAGES,
 *   SEND_TTS_MESSAGES,
 *   MANAGE_MESSAGES,
 *   EMBED_LINKS,
 *   ATTACH_FILES,
 *   READ_MESSAGE_HISTORY,
 *   MENTION_EVERYONE,
 *   EXTERNAL_EMOTES,
 *   ADD_REACTIONS,
 * }
 * ```
 *
 * @example
 * var guild = client.Guilds.find(g => g.name == "test");
 * guild.createRole().then(role => {
 *   var perms = role.permissions;
 *   perms.General.KICK_MEMBERS = true;
 *   perms.General.BAN_MEMBERS = true;
 *   perms.Text.MENTION_EVERYONE = true;
 *
 *   var newRoleName = "Testing";
 *   var color = 0xE74C3C; // red
 *   var hoist = true; // display as separate group
 *
 *   role.commit(newRoleName, color, hoist);
 * }).catch(err => console.log("Failed to create role:", err));
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

  inspect() { return JSON.parse(JSON.stringify(this)); }

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

    if (!member) throw new Error("User is not a member of the context");

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

    if (permissions & Permissions.General.ADMINISTRATOR)
      return IPermissions.ALL;

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

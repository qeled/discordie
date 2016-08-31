"use strict";

const IBase = require("./IBase");
const IUser = require("./IUser");
const IRole = require("./IRole");
const GuildMember = require("../models/GuildMember");
const Utils = require("../core/Utils");

const rest = require("../networking/rest");

/**
 * @interface
 * @model GuildMember
 * @extends IUser
 */
class IGuildMember extends IUser {
  constructor(discordie, userId, guildId) {
    super(discordie, userId, guildId);
    Utils.definePrivate(this, {_guildId: guildId});

    Object.freeze(this);
  }

  /**
   * Current status of the member.
   * @returns {String}
   * @readonly
   */
  get status() {
    return this._discordie._presences.getStatus(this.id, this._guildId);
  }

  /**
   * Current game the member is playing.
   * @returns {Object|null}
   * @readonly
   */
  get game() {
    return this._discordie._presences.getGame(this.id, this._guildId);
  }

  /**
   * Name of the current game the member is playing.
   * @returns {String|null}
   * @readonly
   */
  get gameName() {
    return this.game ? this.game.name : null;
  }

  /**
   * Previous status of the member.
   * @returns {String}
   * @readonly
   */
  get previousStatus() {
    return this._discordie._presences.getPreviousStatus(this.id, this._guildId);
  }

  /**
   * Previous game the member was playing.
   * @returns {Object|null}
   * @readonly
   */
  get previousGame() {
    return this._discordie._presences.getPreviousGame(this.id, this._guildId);
  }

  /**
   * Name of the previous game the member was playing.
   * @returns {String|null}
   * @readonly
   */
  get previousGameName() {
    return this.previousGame ? this.previousGame.name : null;
  }

  /**
   * Gets guild of this member.
   * @returns {IGuild|null}
   * @readonly
   */
  get guild() {
    return this._discordie.Guilds.get(this._guildId);
  }

  /**
   * Gets `nick` of this member if set, otherwise returns `username`.
   * @returns {String|null}
   * @readonly
   */
  get name() {
    return this.nick ? this.nick : this.username;
  }

  /**
   * Gets the first voice channel that this member is currently in.
   * @returns {IVoiceChannel|null}
   */
  getVoiceChannel() {
    return super.getVoiceChannel(this._guildId);
  }

  /**
   * Makes a request to kick this member (from the guild they belong to).
   * @returns {Promise}
   */
  kick() {
    return rest(this._discordie)
      .guilds.members.kickMember(this._guildId, this.id);
  }

  /**
   * Makes a request to ban this member (from the guild they belong to).
   *
   * Additionally delete `deleteMessageForDays` number of days worth of their
   * messages from all channels of the guild.
   * @param deleteMessageForDays - Number of days worth of messages to delete
   *                               (min 0, max 7)
   * @returns {Promise}
   */
  ban(deleteMessageForDays) {
    return rest(this._discordie)
      .guilds.bans.banMember(this._guildId, this._userId, deleteMessageForDays);
  }

  /**
   * Makes a request to unban this member (from the guild they belonged to).
   * @returns {Promise}
   */
  unban() {
    return rest(this._discordie)
      .guilds.bans.unbanMember(this._guildId, this._userId);
  }

  /**
   * Makes a request to mute this member globally in the guild.
   *
   * Returns a resolved promise if the member is already muted.
   * @returns {Promise}
   */
  serverMute(mute) {
    if (mute === undefined) mute = true;
    if (mute == this.mute) return Promise.resolve();
    return rest(this._discordie)
      .guilds.members.setMute(this._guildId, this.id, mute);
  }

  /**
   * Makes a request to unmute this member globally in the guild.
   *
   * Returns a resolved promise if the member is already unmuted.
   * @returns {Promise}
   */
  serverUnmute() {
    return this.serverMute(false);
  }

  /**
   * Makes a request to deafen this member globally in the guild.
   *
   * Returns a resolved promise if the member is already deafened.
   * @returns {Promise}
   */
  serverDeafen(deaf) {
    if (deaf === undefined) deaf = true;
    if (deaf == this.deaf) return Promise.resolve();
    return rest(this._discordie)
      .guilds.members.setDeaf(this._guildId, this.id, deaf);
  }

  /**
   * Makes a request to undeafen this member globally in the guild.
   *
   * Returns a resolved promise if the member is already undeafened.
   * @returns {Promise}
   */
  serverUndeafen() {
    return this.serverDeafen(false);
  }

  /**
   * Checks if this member has the specified role.
   * @param {IRole|String} role - Role or an id string
   * @returns {Promise}
   */
  hasRole(role) {
    role = role.valueOf();
    return this.getRaw().roles.indexOf(role) >= 0;
  }

  /**
   * Assigns (adds) the specified role to this member.
   * @param {IRole|String} role - Role or an id string
   * @returns {Promise}
   */
  assignRole(role) {
    role = role.valueOf();
    const rawMember = this.getRaw();
    if (!rawMember || !rawMember.roles)
      return Promise.reject(new Error("Member does not exist"));
    // raw roles are mutable, copying with .slice()
    const roleIds = rawMember.roles.slice();
    const roleIndex = roleIds.indexOf(role);

    if (roleIndex >= 0) return Promise.resolve();
    roleIds.push(role);

    return rest(this._discordie)
      .guilds.members.setRoles(this._guildId, this.id, roleIds);
  }

  /**
   * Unassigns (removes) the specified role from this member.
   * @param {IRole|String} role - Role or an id string
   * @returns {Promise}
   */
  unassignRole(role) {
    role = role.valueOf();
    const rawMember = this.getRaw();
    if (!rawMember || !rawMember.roles)
      return Promise.reject(new Error("Member does not exist"));
    // raw roles are mutable, copying with .slice()
    const roleIds = rawMember.roles.slice();
    const roleIndex = roleIds.indexOf(role);

    if (roleIndex < 0) return Promise.resolve();
    roleIds.splice(roleIndex, 1);

    return rest(this._discordie)
      .guilds.members.setRoles(this._guildId, this.id, roleIds);
  }

  /**
   * Sets specified roles for this member: overwrites all existing roles
   * with a new set of roles.
   * @param {Array<IRole|String>} roles - Array of roles or id strings
   * @returns {Promise}
   */
  setRoles(roles) {
    const roleIds = roles.map(role => role.valueOf());
    return rest(this._discordie)
      .guilds.members.setRoles(this._guildId, this.id, roleIds);
  }

  /**
   * Moves this member to the specified voice channel.
   * @param {IChannel|String} channel - Channel or an id string
   * @returns {Promise}
   */
  setChannel(channel) {
    channel = channel.valueOf();
    return rest(this._discordie)
      .guilds.members.setChannel(this._guildId, this.id, channel);
  }

  /**
   * Makes a request to set a nickname for this member.
   *
   * Requires permission `MANAGE_NICKNAMES`.
   * @param {String} nick
   * @returns {Promise}
   */
  setNickname(nick) {
    return rest(this._discordie)
      .guilds.members.setNickname(this._guildId, this.id, nick);
  }
}

IGuildMember._inherit(GuildMember, function modelPropertyGetter(key) {
  return this._discordie._members.getMember(this._guildId, this._userId)[key];
});

/**
 * Creates an array of roles assigned to this member.
 * @readonly
 * @instance
 * @memberOf IGuildMember
 * @name roles
 * @returns {Array<IRole>}
 */
IGuildMember._setValueOverride("roles", function(roleIds) {
  const roles = [];
  if (!roleIds) return roles;
  for (let roleId of roleIds) {
    roles.push(new IRole(this._discordie, roleId, this._guildId));
  }
  return roles;
});

module.exports = IGuildMember;

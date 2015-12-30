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
    this._guildId = guildId;
    this._inherit(GuildMember, (key) =>
      this._discordie._members.getMember(this._guildId, this._userId)[key]
    );
    Utils.privatify(this);

    /**
     * @readonly
     * @instance
     * @memberOf IGuildMember
     * @name roles
     * @returns {Array<IRole>}
     */
    this._setValueOverride("roles", roleIds => {
      const roles = [];
      if (!roleIds) return roles;
      for (let roleId of roleIds) {
        roles.push(new IRole(this._discordie, roleId, this._guildId));
      }
      return roles;
    });
    
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
   * Gets the first voice channel that this member is currently in.
   * @returns {IVoiceChannel|null}
   */
  getVoiceChannel() {
    return super.getVoiceChannel(this._guildId);
  }

  kick() {
    return rest(this._discordie)
      .guilds.members.kickMember(this._guildId, this.id);
  }
  ban(deleteMessageForDays) {
    return rest(this._discordie)
      .guilds.bans.banMember(this._guildId, this.id, deleteMessageForDays);
  }
  unban() {
    return this.guild.unban(this.id);
  }
  serverMute(mute) {
    if (mute === undefined) mute = true;
    if (mute == this.mute) return Promise.resolve();
    return rest(this._discordie)
      .guilds.members.setMute(this._guildId, this.id, mute);
  }
  serverUnmute() {
    return this.serverMute(false);
  }
  serverDeafen(deaf) {
    if (deaf === undefined) deaf = true;
    if (deaf == this.deaf) return Promise.resolve();
    return rest(this._discordie)
      .guilds.members.setDeaf(this._guildId, this.id, deaf);
  }
  serverUndeafen() {
    return this.serverDeafen(false);
  }
  hasRole(role) {
    role = role.valueOf();
    return this.getRaw().roles.indexOf(role) >= 0;
  }

  // returns Promise<,Error>
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
  setRoles(roles) {
    const roleIds = roles.map(role => role.valueOf());
    return rest(this._discordie)
      .guilds.members.setRoles(this._guildId, this.id, roleIds);
  }

  setChannel(channel) {
    channel = channel.valueOf();
    return rest(this._discordie)
      .guilds.members.setChannel(this._guildId, this.id, channel);
  }
}

module.exports = IGuildMember;

"use strict";

const Constants = require("../Constants");
const StatusTypes = Constants.StatusTypes;
const Permissions = Constants.Permissions;
const ICollectionBase = require("./ICollectionBase");
const IGuild = require("./IGuild");
const IGuildMember = require("./IGuildMember");
const IChannel = require("./IChannel");
const IUser = require("./IUser");
const Utils = require("../core/Utils");

/**
 * @interface
 * @extends ICollectionBase
 */
class IUserCollection extends ICollectionBase {
  constructor(discordie, valuesGetter, valueGetter) {
    super({
      valuesGetter: valuesGetter,
      valueGetter: valueGetter,
      itemFactory: (id) => new IUser(this._discordie, id)
    });
    this._discordie = discordie;
    Utils.privatify(this);
  }

  /**
   * Creates a new `IGuildMember` for specified `user` of `guild`.
   * @param {IGuild|String} guild
   * @param {IUser|String} user
   * @returns {IGuildMember|null}
   */
  getMember(guild, user) {
    guild = guild.valueOf();
    user = user.valueOf();
    if (!this._discordie._members.getMember(guild, user))
      return null;
    return new IGuildMember(this._discordie, user, guild);
  }
  /**
   * Creates an array of `IGuildMember` for `guild`.
   * @param {IGuild|String} guild
   * @returns {Array<IGuildMember>}
   */
  membersForGuild(guild) {
    guild = guild.valueOf();

    const members = [];
    const guildMembers = this._discordie._members.get(guild);
    if (!guildMembers) return members;
    for (var member of guildMembers.values()) {
      members.push(new IGuildMember(this._discordie, member.id, guild));
    }
    return members;
  }
  /**
   * Creates an array of `IGuildMember` that have permissions to read `channel`.
   * @param {IChannel|String} channel - Channel or channel id
   * @returns {Array<IGuildMember>}
   */
  membersForChannel(channel) {
    if (!(channel instanceof IChannel))
      channel = this._discordie.Channels.get(channel);

    if (!channel) return [];

    const guild = channel.guild;
    if (!guild) throw new Error("Channel does not exist");

    const guildMembers = channel.guild.members;
    if (!guildMembers) return [];
    return guildMembers.filter(m =>
      m.can(Permissions.Text.READ_MESSAGES, channel)
    );
  }
  /**
   * Creates an array of `IGuildMember` containing
   * active members in a voice `channel`.
   * @param {IChannel|String} channel - Channel or channel id
   * @returns {Array<IGuildMember>}
   */
  membersInVoiceChannel(channel) {
    if (!(channel instanceof IChannel))
      channel = this._discordie.Channels.get(channel);

    if (!channel) return [];

    const members = [];
    const guildMembers = this._discordie._members.get(channel.guild_id);
    if (!guildMembers) return members;

    const userMap = this._discordie._voicestates.getStatesInChannel(channel.id);
    for (const id of userMap.keys()) {
      if (guildMembers.has(id))
        members.push(new IGuildMember(this._discordie, id, channel.guild_id));
    }
    return members;
  }
  /**
   * Creates an array of `IGuildMember` for `guild` that are currently online.
   * @param {IGuild|String} guild
   * @returns {Array<IGuildMember>}
   */
  onlineMembersForGuild(guild) {
    guild = guild.valueOf();

    const members = [];
    const presences = this._discordie._presences;
    const guildMembers = this._discordie._members.get(guild);
    if (!guildMembers) return members;
    for (var member of guildMembers.values()) {
      if (presences.getStatus(member.id) != StatusTypes.OFFLINE)
        members.push(new IGuildMember(this._discordie, member.id, guild));
    }
    return members;
  }
  /**
   * Creates an array of `IGuildMember` that
   * have permissions to read `channel` and currently online.
   * @param {IChannel|String} channel - Channel or channel id
   * @returns {Array<IGuildMember>}
   */
  onlineMembersForChannel(channel) {
    return this.membersForChannel(channel).filter(
      m => m.status != StatusTypes.OFFLINE
    );
  }
  /**
   * Creates an array of `IGuildMember` for `guild` that are currently offline.
   * @param {IGuild|String} guild
   * @returns {Array<IGuildMember>}
   */
  offlineMembersForGuild(guild) {
    guild = guild.valueOf();

    const members = [];
    const presences = this._discordie._presences;
    const guildMembers = this._discordie._members.get(guild);
    if (!guildMembers) return members;
    for (var member of guildMembers.values()) {
      if (presences.getStatus(member.id) == StatusTypes.OFFLINE)
        members.push(new IGuildMember(this._discordie, member.id, guild));
    }
    return members;
  }
  /**
   * Creates an array of `IGuildMember` that
   * have permissions to read `channel` and currently offline.
   * @param {IChannel|String} channel - Channel or channel id
   * @returns {Array<IGuildMember>}
   */
  offlineMembersForChannel(channel) {
    return this.membersForChannel(channel).filter(
        m => m.status == StatusTypes.OFFLINE
    );
  }
}

module.exports = IUserCollection;

"use strict";

const Constants = require("../Constants");
const StatusTypes = Constants.StatusTypes;
const Permissions = Constants.Permissions;
const ICollectionBase = require("./ICollectionBase");
const IGuild = require("./IGuild");
const IGuildMember = require("./IGuildMember");
const IChannel = require("./IChannel");
const IUser = require("./IUser");
const IDirectMessageChannel = require("./IDirectMessageChannel");
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
    Utils.definePrivate(this, {_discordie: discordie});
  }

  /**
   * Request members and wait until cache populates for all guilds or
   * an array of guilds.
   * Request is made over gateway websocket.
   *
   * Will request members for all guilds if no arguments passed.
   *
   * By default Discord sends only online members if there are more than 250
   * (offline and online total) joined in a guild.
   *
   * Returned promise will resolve when all members have been fetched.
   * Returned promise will reject if all or some members have not been received
   * within 60 seconds or primary gateway websocket disconnected.
   *
   * If all members for chosen guilds are already in cache - returns a
   * resolved promise.
   *
   * > **Note:** When guilds become unavailable or deleted
   * >           (events `GUILD_UNAVAILABLE` and `GUILD_DELETE`)
   * >           all members will also be deleted from cache.
   * @param {IGuild|String|Array<IGuild|String>} [guilds]
   * @returns {Promise}
   * @example
   * client.Users.fetchMembers()
   *   .then(() => console.log("Received members for all guilds"));
   *
   * client.Users.fetchMembers([guild1, guild2, guild3])
   *   .then(() => console.log("Received members for 3 guilds"));
   *
   * var p1 = client.Users.fetchMembers(guild1);
   * p1.catch(err => console.log("Failed to receive guild1 members: " + err));
   * var p2 = client.Users.fetchMembers(guild2);
   * var p3 = client.Users.fetchMembers(guild3);
   * Promise.all([p1, p2, p3])
   *   .then(() => console.log("Received members for 3 guilds"));
   *   .catch(err => console.log("Failed to receive some members: " + err));
   */
  fetchMembers(guilds) {
    if (guilds) {
      if (guilds.map) guilds = guilds.map(guild => guild.valueOf());
      else guilds = [guilds.valueOf()];
    }
    return this._discordie._members.fetchMembers(guilds);
  }

  /**
   * Gets a `IGuildMember` for specified `user` of `guild`.
   *
   * Returns null if the user is not a member of the guild.
   * @param {IGuild|String} guild - Guild or an id string
   * @param {IUser|String} user - User or an id string
   * @returns {IGuildMember|null}
   */
  getMember(guild, user) {
    guild = guild.valueOf();
    user = user.valueOf();
    var member = this._discordie._members.getMember(guild, user);
    if (!member) return null;
    return this._getOrCreateInterface(member,
      () => new IGuildMember(this._discordie, user, guild)
    );
  }
  /**
   * Creates an array of `IGuildMember` for `guild`.
   * @param {IGuild|String} guild - Guild or an id string
   * @returns {Array<IGuildMember>}
   */
  membersForGuild(guild) {
    guild = guild.valueOf();

    const members = [];
    const guildMembers = this._discordie._members.get(guild);
    if (!guildMembers) return members;
    for (var member of guildMembers.values()) {
      members.push(this._getOrCreateInterface(member,
        () => new IGuildMember(this._discordie, member.id, guild)
      ));
    }
    return members;
  }
  /**
   * Creates an array of `IGuildMember` that have permissions to read `channel`.
   *
   * > **Note:** This method computes permissions for all members and may be CPU
   * >           intensive for large guilds.
   * @param {ITextChannel|String} channel - Channel or an id string
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
   * @param {IVoiceChannel|String} channel - Channel or an id string
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
    for (var id of userMap.keys()) {
      const member = guildMembers.get(id);
      if (!member) continue;
      members.push(this._getOrCreateInterface(member,
        () => new IGuildMember(this._discordie, id, channel.guild_id)
      ));
    }
    return members;
  }
  /**
   * Creates an array of `IUser` containing users in a private voice channel.
   * @param {IDirectMessageChannel|String} channel - Channel or an id string
   * @returns {Array<IUser>}
   */
  usersInCall(channel) {
    if (!(channel instanceof IDirectMessageChannel))
      channel = this._discordie.DirectMessageChannels.get(channel);

    if (!channel) return [];
    const users = [];

    const userMap = this._discordie._voicestates.getStatesInChannel(channel.id);
    for (var id of userMap.keys()) {
      const user = this.get(id);
      if (user) users.push(user);
    }
    return users;
  }
  /**
   * Creates an array of `IGuildMember` for `guild` that are currently online.
   * @param {IGuild|String} guild - Guild or an id string
   * @returns {Array<IGuildMember>}
   */
  onlineMembersForGuild(guild) {
    guild = guild.valueOf();

    const members = [];
    const presences = this._discordie._presences;
    const guildMembers = this._discordie._members.get(guild);
    if (!guildMembers) return members;
    for (var member of guildMembers.values()) {
      if (presences.getStatus(member.id) != StatusTypes.OFFLINE) {
        members.push(this._getOrCreateInterface(member,
          () => new IGuildMember(this._discordie, member.id, guild)
        ));
      }
    }
    return members;
  }
  /**
   * Creates an array of `IGuildMember` that
   * have permissions to read `channel` and currently online.
   *
   * > **Note:** This method computes permissions for all members and may be CPU
   * >           intensive for large guilds.
   * @param {ITextChannel|String} channel - Channel or an id string
   * @returns {Array<IGuildMember>}
   */
  onlineMembersForChannel(channel) {
    return this.membersForChannel(channel).filter(
      m => m.status != StatusTypes.OFFLINE
    );
  }
  /**
   * Creates an array of `IGuildMember` for `guild` that are currently offline.
   *
   * Does not guarantee every offline member unless
   * `IUserCollection.fetchMembers` has been called for the `guild`.
   *
   * @param {IGuild|String} guild - Guild or an id string
   * @returns {Array<IGuildMember>}
   */
  offlineMembersForGuild(guild) {
    guild = guild.valueOf();

    const members = [];
    const presences = this._discordie._presences;
    const guildMembers = this._discordie._members.get(guild);
    if (!guildMembers) return members;
    for (var member of guildMembers.values()) {
      if (presences.getStatus(member.id) == StatusTypes.OFFLINE) {
        members.push(this._getOrCreateInterface(member,
          () => new IGuildMember(this._discordie, member.id, guild)
        ));
      }
    }
    return members;
  }
  /**
   * Creates an array of `IGuildMember` that
   * have permissions to read `channel` and currently offline.
   *
   * Does not guarantee every offline member unless
   * `IUserCollection.fetchMembers` has been called for the guild the `channel`
   * belongs to.
   *
   * > **Note:** This method computes permissions for all members and may be CPU
   * >           intensive for large guilds.
   * @param {ITextChannel|String} channel - Channel or an id string
   * @returns {Array<IGuildMember>}
   */
  offlineMembersForChannel(channel) {
    return this.membersForChannel(channel).filter(
        m => m.status == StatusTypes.OFFLINE
    );
  }
}

module.exports = IUserCollection;

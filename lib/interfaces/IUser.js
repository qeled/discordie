"use strict";

const IBase = require("./IBase");
const IMessage = require("./IMessage");
const IPermissions = require("./IPermissions");
const Utils = require("../core/Utils");
const User = require("../models/User");
const Constants = require("../Constants");
const Endpoints = Constants.Endpoints;

/**
 * @interface
 * @model User
 * @extends IBase
 */
class IUser extends IBase {
  constructor(discordie, userId) {
    super();
    Utils.definePrivate(this, {
      _discordie: discordie,
      _userId: userId
    });

    if (this.constructor == IUser) {
      Object.freeze(this);
    }
  }

  /**
   * Gets date and time the account was registered (created) at.
   * @returns {Date}
   * @readonly
   */
  get registeredAt() {
    return new Date(Utils.timestampFromSnowflake(this.id));
  }

  /**
   * Gets current avatar URL.
   * @returns {String|null}
   * @readonly
   */
  get avatarURL() {
    if (!this.avatar) return null;
    return Constants.CDN_ENDPOINT + Endpoints.CDN_AVATAR(this.id, this.avatar);
  }

  /**
   * Current status of the user.
   * @returns {String}
   * @readonly
   */
  get status() {
    return this._discordie._presences.getStatus(this.id);
  }

  /**
   * Current game the user is playing.
   * @returns {Object|null}
   * @readonly
   */
  get game() {
    return this._discordie._presences.getGame(this.id);
  }

  /**
   * Name of the current game the user is playing.
   * @returns {String|null}
   * @readonly
   */
  get gameName() {
    return this.game ? this.game.name : null;
  }

  /**
   * Previous status of the user.
   * @returns {String}
   * @readonly
   */
  get previousStatus() {
    return this._discordie._presences.getPreviousStatus(this.id);
  }

  /**
   * Previous game the user was playing.
   * @returns {Object|null}
   * @readonly
   */
  get previousGame() {
    return this._discordie._presences.getPreviousGame(this.id);
  }

  /**
   * Name of the previous game the user was playing.
   * @returns {String|null}
   * @readonly
   */
  get previousGameName() {
    return this.previousGame ? this.previousGame.name : null;
  }


  /**
   * Checks whether the user is mentioned in a `message`.
   * @param {IMessage} message
   * @returns {boolean}
   */
  isMentioned(message) {
    if (!message) return false;
    if (!(message instanceof IMessage)) {
      if (message.id) message = message.id;
      message = this._discordie.Messages.get(message);
      if (!message) return false;
    }

    return message.mentions.some(mention => mention.id === this.id) ||
      message.mention_everyone;
  }

  /**
   * Opens or gets existing Direct Message channel.
   * @returns {Promise<IDirectMessageChannel, Error>}
   */
  openDM() {
    return this._discordie.DirectMessageChannels.getOrOpen(this);
  }

  /**
   * Attempts to get a guild member interface, returns null if this user is not
   * a member of the `guild` or `guild` is not in cache.
   * @param {IGuild|String} guild
   * @returns {IGuildMember|null}
   */
  memberOf(guild) {
    return this._discordie.Users.getMember(guild.valueOf(), this.id) || null;
  }

  /**
   * Resolves permissions for user in `context`.
   *
   * Returns a helper object with getter boolean properties.
   *
   * Throws:
   *
   * - ** `"user must be an instance of IUser"` **
   *
   *   If the method was called without binding to a `IUser` object
   *   (as a function).
   *
   * - ** `"context must be an instance of IChannel or IGuild"` **
   *
   *   If context type is invalid.
   *
   * - ** `"Invalid context"` **
   *
   *   If context object no longer exists in cache.
   *
   * - ** `"User is not a member of the context"` **
   *
   *   If this user is not a member of the guild or
   *   guild the channel belongs to.
   *
   * See documentation of `IPermissions` for list of possible permissions.
   * @param {IChannel|IGuild} context
   * @returns {IPermissions}
   * @example
   * const guild = client.Guilds.find(g => g.name == "test");
   * const channel = guild.channels.find(c => c.name == "restricted");
   * const user = guild.members.find(m => m.username == "testuser");
   *
   * const guildPerms = user.permissionsFor(guild); // resolves to role permissions
   * const channelPerms = user.permissionsFor(channel); // resolves to channel permissions
   *
   * console.log(guildPerms.General.MANAGE_ROLES); // false
   * console.log(guildPerms.Text.READ_MESSAGES); // true

   * // The `restricted` channel has `READ_MESSAGES` denied
   * console.log(channelPerms.Text.READ_MESSAGES); // false
   */
  permissionsFor(context) {
    return IPermissions.resolve(this, context);
  }

  /**
   * Resolves permissions for user in `context` and checks if
   * user has `permission`.
   *
   * See `IUser.permissionsFor` method for list of throwable errors.
   *
   * See documentation of `IPermissions` for full list of possible permissions.
   * @param {Number} permission - One or multiple permission bits
   * @param {IChannel|IGuild} context
   * @returns {boolean}
   * @example
   * const guild = client.Guilds.find(g => g.name == "test");
   * const channel = guild.channels.find(c => c.name == "node_discordie");
   * const user = guild.members.find(m => m.username == "testuser");
   * user.can(Discordie.Permissions.General.KICK_MEMBERS, guild); // resolves to role permissions
   * user.can(Discordie.Permissions.Text.READ_MESSAGES, channel); // resolves to channel permissions
   */
  can(permission, context) {
    return (IPermissions.resolveRaw(this, context) & permission) != 0;
  }

  /**
   * Gets the first voice channel that member of `guild` currently in.
   * @param {IGuild|String|null} guild
   * Guild or an id string, null for private call
   * (call channel is only available if recipient is in call with current user)
   * @returns {IVoiceChannel|null}
   */
  getVoiceChannel(guild) {
    const state = this._discordie._voicestates.getUserStateInGuild(
      (guild ? guild.valueOf() : null), this.id
    );
    if (!state) return null;
    return this._discordie.Channels.get(state.channel_id);
  }

  /**
   * Creates a mention from this user's id.
   * @returns {String}
   * @readonly
   * @example
   * channel.sendMessage(user.mention + ", example mention");
   */
  get mention() {
    return `<@${this.id}>`;
  }

  /**
   * Creates a nickname mention from this user's id.
   * @returns {String}
   * @readonly
   */
  get nickMention() {
    return `<@!${this.id}>`;
  }
}

IUser._inherit(User, function modelPropertyGetter(key) {
  return this._discordie._users.get(this._userId)[key];
});

module.exports = IUser;

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
 */
class IUser extends IBase {
  constructor(discordie, userId) {
    super(User, (key) => this._discordie._users.get(this._userId)[key]);
    this._discordie = discordie;
    this._userId = userId;
    if (this.constructor == IUser) {
      Utils.privatify(this);
      Object.freeze(this);
    }
  }

  /**
   * Gets current avatar URL.
   * @returns {String}
   */
  get avatarURL() {
    if (!this.avatar) return null;
    return Constants.API_ENDPOINT + Endpoints.AVATAR(this.id, this.avatar);
  }

  /**
   * Current status of the user.
   * @returns {String}
   */
  get status() {
    return this._discordie._presences.getStatus(this.id);
  }

  /**
   * Current id of game the user is playing.
   * @returns {Number|null}
   */
  get gameId() {
    return this._discordie._presences.getGame(this.id);
  }

  /**
   * Previous status of the user.
   * @returns {String}
   */
  get previousStatus() {
    return this._discordie._presences.getPreviousStatus(this.id);
  }

  /**
   * Previous id of game the user was playing.
   * @returns {Number|null}
   */
  get previousGameId() {
    return this._discordie._presences.getPreviousGame(this.id);
  }


  /**
   * Checks whether the user is mentioned in a `message`.
   * @param {IMessage} message
   * @returns {boolean}
   */
  isMentioned(message) {
    if (!(message instanceof IMessage)) {
      if (!message.id)
        return false;
      message = this._discordie.Messages.get(message);
    }
    if (!message)
      return false;

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
   * Tries to get a guild member interface, returns null if failed.
   * @param {IGuild} guild
   * @returns {IGuildMember|null}
   */
  memberOf(guild) {
    return this._discordie.Users.getMember(guild.valueOf(), this.id) || null;
  }

  /**
   * Resolves permissions for user in `context`.
   * @param {IChannel|IGuild} context
   * @returns {IPermissions}
   */
  permissionsFor(context) {
    return IPermissions.resolve(this, context);
  }

  /**
   * Resolves permissions for user in `context` and checks if user has `permission`.
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
    return (IPermissions.resolve(this, context).raw & permission) != 0;
  }

  /**
   * Creates a mention from this user's id.
   * @returns {String}
   * @example
   * channel.sendMessage(user.mention + ", example mention");
   */
  get mention() {
    return `<@${this.id}>`;
  }
}

module.exports = IUser;

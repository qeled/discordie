"use strict";

const IBase = require("./IBase");
const IUser = require("./IUser");
const Utils = require("../core/Utils");
const AuthenticatedUser = require("../models/AuthenticatedUser");
const Constants = require("../Constants");
const StatusTypes = Constants.StatusTypes;

const rest = require("../networking/rest");

/**
 * @interface
 */
class IAuthenticatedUser extends IBase {
  constructor(discordie) {
    super(AuthenticatedUser, (key) => this._discordie._user[key]);
    this._discordie = discordie;
    Utils.privatify(this);
    Object.freeze(this);
  }

  /**
   * Gets current avatar URL.
   * @returns {String}
   */
  get avatarURL() {
    return Object.getOwnPropertyDescriptor(IUser.prototype, "avatarURL")
        .get.apply(this, arguments);
  }

  /**
   * Gets a value indicating whether the account is claimed.
   * @type {boolean}
   */
  get isClaimedAccount() {
    return this.email != null;
  }

  /**
   * Checks whether the user is mentioned in a `message`.
   * @param {IMessage} message
   * @returns {boolean}
   */
  isMentioned(message) {
    return IUser.prototype.isMentioned.apply(this, arguments);
  }

  /**
   * Makes a request to edit user profile,
   * substituting null or undefined properties with current values.
   * @param {String} currentPassword
   * @param {String} [username] - optional
   * @param {String|null} [avatar] - Data url with base64 data, optional
   * @param {String} [email] - optional
   * @param {String} [newPassword] - optional
   * @returns {Promise<IUser, Error>}
   */
  edit(currentPassword, username, avatar, email, newPassword) {
    const user = this._discordie._user;
    username =
        (username === undefined || !username ? user.username : username);
    avatar = avatar || null;
    email =
        (email === undefined || !email ? user.email : email);
    newPassword =
        (newPassword === undefined || !newPassword ? null : newPassword);

    return new Promise((rs, rj) => {
      rest(this._discordie)
        .users.me(currentPassword, username, avatar, email, newPassword)
      .then(() => rs(this._discordie.User))
      .catch(rj);
    });
  }

  /**
   * Sets current user status via websocket.
   * @param {String} status
   * @param {Number|null} gameId
   * @example
   * client.User.setStatus(StatusTypes.IDLE, 305); // idle, playing 305
   * client.User.setStatus(null, 305); // no status change, playing 305
   * client.User.setStatus("idle", null); // idle, not playing
   */
  setStatus(status, gameId) {
    if (arguments.length == 0) return;
    if (!status) status = this.status;
    if (gameId === undefined) gameId = this.gameId;

    status = status.toLowerCase();
    const idle = (StatusTypes.IDLE.toLowerCase() == status);

    if (this._discordie._user) {
      this._discordie._user = this._discordie._user.merge({
        status: (idle ? StatusTypes.IDLE : StatusTypes.ONLINE),
        gameId: gameId
      });
    }

    this._discordie.gatewaySocket.statusUpdate(idle ? 1337 : null, gameId);
  }

  /**
   * Sets playing game for current user via websocket.
   * @param {Number|null} gameId
   */
  setGameId(gameId) {
    if (arguments.length == 0) return;
    this.setStatus(null, gameId);
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
    return IUser.prototype.permissionsFor.apply(this, arguments);
  }

  /**
   * See `IUser.can`
   * @param {Number} permission - One or multiple permission bits
   * @param {IChannel|IGuild} context
   * @returns {boolean}
   */
  can(permission, context) {
    return IUser.prototype.can.apply(this, arguments);
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

module.exports = IAuthenticatedUser;

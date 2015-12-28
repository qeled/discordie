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
 * @model AuthenticatedUser
 * @extends IBase
 */
class IAuthenticatedUser extends IBase {
  constructor(discordie) {
    super(AuthenticatedUser, (key) => this._discordie._user[key]);
    this._discordie = discordie;
    Utils.privatify(this);
    Object.freeze(this);
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
    return Object.getOwnPropertyDescriptor(IUser.prototype, "avatarURL")
      .get.apply(this, arguments);
  }

  /**
   * Gets a value indicating whether the account is claimed.
   * @returns {boolean}
   * @readonly
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
   * substituting undefined properties with current values.
   * Passing `null` in `avatar` will remove current avatar.
   * @param {String} currentPassword
   * @param {String} [username]
   * @param {String|Buffer|null} [avatar] - Buffer or base64 data url
   * @param {String} [email]
   * @param {String} [newPassword]
   * @returns {Promise<IUser, Error>}
   * @example
   * // avatar from file
   * client.User.edit(currentPassword, null, fs.readFileSync("test.png"));
   * client.User.edit(currentPassword, null, fs.readFileSync("test.jpg"));
   * // avatar unchanged
   * client.User.edit(currentPassword, "test", undefined, "new@example.com");
   * client.User.edit(currentPassword, "test", client.User.avatar);
   * // no avatar / default avatar
   * client.User.edit(currentPassword, "test", null);
   */
  edit(currentPassword, username, avatar, email, newPassword) {
    const user = this._discordie._user;
    username = username || user.username;
    email = email || user.email;
    newPassword = newPassword || null;

    if (avatar instanceof Buffer) {
      avatar = Utils.imageToDataURL(avatar);
    } else if (avatar === undefined) {
      avatar = user.avatar;
    }

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
   * @param {Object|null} game - {name: String}
   * @example
   * var game = {name: "with code"}; // sets status as "Playing with code"
   * client.User.setStatus(StatusTypes.IDLE, game); // idle, playing
   * client.User.setStatus(null, game); // no status change, playing
   * client.User.setStatus("idle", null); // idle, not playing
   */
  setStatus(status, game) {
    if (arguments.length == 0) return;
    if (!status) status = this.status;
    if (game === undefined) game = this.game;

    status = status.toLowerCase();
    const idle = (StatusTypes.IDLE.toLowerCase() == status);

    if (this._discordie._user) {
      this._discordie._user = this._discordie._user.merge({
        status: (idle ? StatusTypes.IDLE : StatusTypes.ONLINE),
        game: game
      });
    }

    this._discordie.gatewaySocket.statusUpdate(idle ? 1337 : null, game);
  }

  /**
   * Sets playing game for current user via websocket.
   * @param {Object|null} game
   */
  setGame(game) {
    if (arguments.length == 0) return;
    this.setStatus(null, game);
  }

  /**
   * Name of the game current user is playing.
   * @returns {String|null}
   * @readonly
   */
  get gameName() {
    return this.game ? this.game.name : null;
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
   * @see IUser.can
   * @param {Number} permission - One or multiple permission bits
   * @param {IChannel|IGuild} context
   * @returns {boolean}
   */
  can(permission, context) {
    return IUser.prototype.can.apply(this, arguments);
  }

  /**
   * See `IUser.getVoiceChannel`
   * @see IUser.getVoiceChannel
   * @param {IGuild} guild
   * @returns {IVoiceChannel|null}
   */
  getVoiceChannel(guild) {
    return IUser.prototype.getVoiceChannel.apply(this, arguments);
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
}

module.exports = IAuthenticatedUser;

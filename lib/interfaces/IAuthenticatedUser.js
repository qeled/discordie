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
    super();
    Utils.definePrivate(this, {_discordie: discordie});
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
   * @param {boolean} ignoreImplicitMentions
   * @returns {boolean}
   */
  isMentioned(message, ignoreImplicitMentions) {
    return IUser.prototype.isMentioned.apply(this, arguments);
  }

  /**
   * Makes a request to get the bot's OAuth2 application info.
   *
   * Works only with bot accounts.
   *
   * Example response object:
   * ```js
   * {
   *   "description": "Test",
   *   "icon": null,
   *   "id": "179527948411052118",
   *   "name": "app name or something",
   *   "rpc_origins": [],
   *   "flags": 0,
   *   "owner": {
   *     "username": "bot owner",
   *     "discriminator": "4937",
   *     "id": "169454786183781631",
   *     "avatar": null
   *   }
   * }
   * ```
   * @returns {Promise<Object, Error>}
   */
  getApplication() {
    return rest(this._discordie).oauth2.getApplication(Constants.ME);
  }

  /**
   * Makes a request to edit user profile,
   * substituting `undefined` or `null` properties with current values.
   *
   * Passing `null` in `avatar` will remove current avatar. Use `undefined`
   * instead of `null` in this case.
   * @param {String} currentPassword - Use null as password on bot accounts
   * @param {String} [username]
   * @param {String|Buffer|null} [avatar] - Buffer or base64 data URL
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
   * Makes a request to edit avatar.
   *
   * Setting avatar to `null` will remove current avatar.
   * @param {String|Buffer|null} avatar - Buffer or base64 data URL
   * @param {String} [currentPassword] - Not applicable for bot accounts
   * @example
   * // avatar from file
   * client.User.setAvatar(fs.readFileSync("test.png"));
   * // remove avatar
   * client.User.setAvatar(null);
   */
  setAvatar(avatar, currentPassword) {
    return this.edit(currentPassword, null, avatar);
  }

  /**
   * Makes a request to edit username.
   * @param {String} username
   * @param {String} [currentPassword] - Not applicable for bot accounts
   */
  setUsername(username, currentPassword) {
    return this.edit(currentPassword, username);
  }

  /**
   * Sets current user status via websocket.
   *
   * With multiple sessions status from last connected will override statuses
   * from previous sessions.
   *
   * > Note: By default Discord client does not display game/status updates for
   * > the user it's logged in into. It will be visible for other users.
   * @param {String} status
   * @param {Object|String|null} game - Object `{name: String}` or string
   * @example
   * var game = {name: "with code"}; // sets status as "Playing with code"
   * var streamingGame = {type: 1, name: "something", url: ""}; // "Streaming"
   * // note: streaming status requires a valid twitch url:
   * //       ex. "http://twitch.tv/channel"
   * client.User.setStatus("idle", game); // idle, playing
   * client.User.setStatus(null, game); // no status change, playing
   * client.User.setStatus(null, "with code"); // no status change, playing
   * client.User.setStatus(null, streamingGame); // no status change, streaming
   * client.User.setStatus("online", game); // online, playing
   * client.User.setStatus("idle", null); // idle, not playing
   */
  setStatus(status, game) {
    if (arguments.length == 0) return;
    if (!status) status = this.status;
    if (game === undefined) game = this.game;
    if (typeof game === "string") game = {name: game};

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
   *
   * With multiple sessions status from last connected will override statuses
   * from previous sessions.
   *
   * > Note: By default Discord client does not display game/status updates for
   * > the user it's logged in into. It will be visible for other users.
   * @param {Object|String|null} game - Object `{name: String}` or string
   * @example
   * var game = {name: "with code"}; // sets game as "Playing with code"
   * var streamingGame = {type: 1, name: "something", url: ""}; // "Streaming"
   * // note: streaming status requires a valid twitch url:
   * //       ex. "http://twitch.tv/channel"
   * client.User.setGame(game); // playing
   * client.User.setGame("with code"); // playing
   * client.User.setGame(streamingGame); // streaming
   * client.User.setGame(null); // not playing
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
   * Attempts to get a guild member interface, returns null if this user is not
   * a member of the `guild` or `guild` is not in cache.
   * @param {IGuild|String} guild
   * @returns {IGuildMember|null}
   */
  memberOf(guild) {
    return this._discordie.Users.getMember(guild.valueOf(), this.id) || null;
  }

  /**
   * See `IUser.permissionsFor`.
   * @see IUser.permissionsFor
   * @param {IChannel|IGuild} context
   * @returns {IPermissions}
   */
  permissionsFor(context) {
    return IUser.prototype.permissionsFor.apply(this, arguments);
  }

  /**
   * See `IUser.can`.
   * @see IUser.can
   * @param {Number} permission - One or multiple permission bits
   * @param {IChannel|IGuild} context
   * @returns {boolean}
   */
  can(permission, context) {
    return IUser.prototype.can.apply(this, arguments);
  }

  /**
   * See `IUser.getVoiceChannel`.
   * @see IUser.getVoiceChannel
   * @param {IGuild|String} guild - Guild or an id string
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

  /**
   * Creates a nickname mention from this user's id.
   * @returns {String}
   * @readonly
   */
  get nickMention() {
    return `<@!${this.id}>`;
  }
}

IAuthenticatedUser._inherit(AuthenticatedUser, function(key) {
  return this._discordie._user[key];
});

module.exports = IAuthenticatedUser;

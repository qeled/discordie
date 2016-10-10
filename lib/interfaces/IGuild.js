"use strict";

const Constants = require("../Constants");
const Endpoints = Constants.Endpoints;

const IBase = require("./IBase");
const IChannel = require("./IChannel");
const IGuildMember = require("./IGuildMember");
const IUser = require("./IUser");
const IRole = require("./IRole");
const Utils = require("../core/Utils");
const Guild = require("../models/Guild");

const rest = require("../networking/rest");

/**
 * @interface
 * @model Guild
 * @extends IBase
 */
class IGuild extends IBase {
  constructor(discordie, guildId) {
    super();
    Utils.definePrivate(this, {
      _discordie: discordie,
      _guildId: guildId
    });

    Object.freeze(this);
  }

  /**
   * Creates an acronym string for this guild.
   * (Text that shows up as guild icon in the client if there is no image icon.)
   * @returns {String}
   * @readonly
   */
  get acronym() {
    if (!this.name) return "";
    return this.name.replace(/\w+/g, match => match[0]).replace(/\s/g, "");
  }

  /**
   * Creates a string URL of image icon of this guild.
   * @returns {String|null}
   * @readonly
   */
  get iconURL() {
    if (!this.icon) return null;
    return Constants.CDN_ENDPOINT +
      Endpoints.CDN_GUILD_ICON(this.id, this.icon);
  }

  /**
   * Creates a string URL of invite splash image of this guild.
   * @returns {String|null}
   * @readonly
   */
  get splashURL() {
    if (!this.splash) return null;
    return Constants.CDN_ENDPOINT +
      Endpoints.CDN_GUILD_SPLASH(this.id, this.splash);
  }

  /**
   * Checks whether the `user` is the owner of this guild.
   * @param {IGuildMember|IUser|IAuthenticatedUser|String} user
   * @returns {boolean}
   */
  isOwner(user) {
    if (!user) return false;
    if (!this.owner_id) return false;
    return this.owner_id === user.valueOf();
  }

  /**
   * Returns afk channel of this guild.
   * @returns {IChannel|null}
   * @readonly
   */
  get afk_channel() {
    if (!this.afk_channel_id) return null;
    const afk_channel = this._discordie.Channels.get(this.afk_channel_id);
    return afk_channel ? afk_channel : null;
  }

  /**
   * Returns the owner of this guild.
   *
   * Returns null if the owner user is not in cache.
   *
   * See `.isOwner(user)` if you want to safely check if the `user` is owner.
   * @returns {IAuthenticatedUser|IUser|null}
   * @readonly
   */
  get owner() {
    if (!this.owner_id) return null;
    const owner = this._discordie.Users.get(this.owner_id);
    if (!owner) return null;
    if (this._discordie.User.equals(owner))
      return this._discordie.User;
    return owner;
  }

  /**
   * Creates an array of text and voice channels of this guild.
   * @returns {Array<IChannel>}
   * @readonly
   */
  get channels() {
    return this._discordie.Channels.forGuild(this.id);
  }

  /**
   * Creates an array of text channels of this guild.
   * @returns {Array<ITextChannel>}
   * @readonly
   */
  get textChannels() {
    return this._discordie.Channels.textForGuild(this.id);
  }

  /**
   * Creates an array of voice channels of this guild.
   * @returns {Array<IVoiceChannel>}
   * @readonly
   */
  get voiceChannels() {
    return this._discordie.Channels.voiceForGuild(this.id);
  }

  /**
   * Returns general channel of this guild.
   * @returns {ITextChannel}
   * @readonly
   */
  get generalChannel() {
    return this._discordie.Channels.get(this.id);
  }

  /**
   * Makes a request to edit this guild,
   * substituting `undefined` or `null` properties with current values.
   *
   * Passing `null` in `icon` or `afkChannelId` will remove current
   * icon/channel. Use `undefined` instead of `null` in this case.
   * @param {String} [name]
   * @param {String|Buffer|null} [icon]
   * @param {String} [region]
   * @param {IChannel|String|null} [afkChannelId] - Channel or an id string
   * @param {Number} [afkTimeout] - 60, 300, 900, 1800 or 3600 seconds
   * @param {Number} [verificationLevel]
   * See Discordie.VerificationLevel
   * @param {Number} [defaultMessageNotifications]
   * See Discordie.UserNotificationSettings
   * @returns {Promise<IGuild, Error>}
   */
  edit(name, icon, region, afkChannelId, afkTimeout, verificationLevel,
       defaultMessageNotifications) {
    const guild = this._discordie._guilds.get(this._guildId);
    name = name || guild.name;
    region = region || guild.region;
    afkTimeout = afkTimeout || guild.afk_timeout;

    const opt = (value, _) => value != null ? value : _;
    verificationLevel =
      opt(verificationLevel, guild.verification_level);
    defaultMessageNotifications =
      opt(defaultMessageNotifications, guild.default_message_notifications);

    if (icon instanceof Buffer) {
      icon = Utils.imageToDataURL(icon);
    } else if (icon === undefined) {
      icon = guild.icon;
    }

    if (afkChannelId === undefined) {
      afkChannelId = guild.afk_channel_id;
    } else if (afkChannelId != null) {
      afkChannelId = afkChannelId.valueOf();
    }

    return new Promise((rs, rj) => {
      rest(this._discordie)
        .guilds.patchGuild(
          guild.id,
          name, icon, region,
          afkChannelId, afkTimeout,
          verificationLevel,
          defaultMessageNotifications
        )
      .then(() => rs(this))
      .catch(rj);
    });
  }

  /**
   * Makes a request to create a channel in this guild.
   * @param {Number} type - See IChannel / Discordie.ChannelTypes
   * @param {String} name
   * @param {Array<IPermissionOverwrite>} [permissionOverwrites]
   * @param {Number} [bitrate] - Only for voice channels
   * @param {Number} [userLimit] - Only for voice channels
   * @returns {Promise<ITextChannel|IVoiceChannel, Error>}
   */
  createChannel(type, name, permissionOverwrites, bitrate, userLimit) {
    permissionOverwrites = permissionOverwrites || [];
    if (!Array.isArray(permissionOverwrites))
      throw TypeError("Param 'permissionOverwrites' must be an array");

    permissionOverwrites = permissionOverwrites.map(v => {
      return typeof v.getRaw === "function" ? v.getRaw() : null;
    }).filter(v => v);

    return new Promise((rs, rj) => {
      rest(this._discordie)
        .channels.createChannel(this.id,
          type, name, permissionOverwrites, bitrate, userLimit
        )
      .then(channel => rs(this._discordie.Channels.get(channel.id)))
      .catch(rj);
    });
  }

  /**
   * Makes a request to create a role in this guild.
   * @returns {Promise<IRole, Error>}
   */
  createRole() {
    return new Promise((rs, rj) => {
      rest(this._discordie).guilds.roles.createRole(this.id)
      .then(role => rs(new IRole(this._discordie, role.id, this.id)))
      .catch(rj);
    });
  }

  /**
   * Makes a request to create an invite for general channel in this guild.
   *
   * See `IChannel.createInvite` for more info.
   * @see IChannel.createInvite
   * @param {Object} options
   * @returns {Promise<Object, Error>}
   */
  createInvite(options) {
    return this._discordie.Invites.create(this.generalChannel, options);
  }

  /**
   * Creates an array containing members of this guild.
   * @returns {Array<IGuildMember>}
   * @readonly
   */
  get members() {
    return this._discordie.Users.membersForGuild(this.id);
  }

  /**
   * Makes a request to delete this guild.
   *
   * Returns a rejected promise if the user **is not** owner.
   * @returns {Promise}
   */
  delete() {
    if (!this.owner.equals(this._discordie.User))
      return Promise.reject();
    return rest(this._discordie).guilds.deleteGuild(this.id);
  }

  /**
   * Makes a request to delete this guild.
   *
   * Returns a rejected promise if the user **is** owner.
   * @returns {Promise}
   */
  leave() {
    if (this.owner.equals(this._discordie.User))
      return Promise.reject();
    return rest(this._discordie).guilds.leaveGuild(this.id);
  }

  /**
   * Makes a request to ban a user (does not have to be a member of the guild).
   *
   * Additionally delete `deleteMessageForDays` number of days worth of their
   * messages from all channels of the guild.
   * @param {IUser|String} user - User or an id string
   * @param deleteMessageForDays - Number of days worth of messages to delete
   *                               (min 0, max 7)
   * @returns {Promise}
   */
  ban(user, deleteMessageForDays) {
    user = user.valueOf();
    return rest(this._discordie)
      .guilds.bans.banMember(this.id, user, deleteMessageForDays);
  }

  /**
   * Makes a request to unban a user.
   * @param {IUser|String} user - User or an id string
   * @returns {Promise}
   */
  unban(user) {
    user = user.valueOf();
    return rest(this._discordie).guilds.bans.unbanMember(this.id, user);
  }

  /**
   * Makes a request to get ban list of this guild.
   * @returns {Promise<Array<IUser>, Error>}
   */
  getBans() {
    return new Promise((rs, rj) => {
      rest(this._discordie).guilds.bans.getBans(this.id)
      .then(bans => {
        const bannedUsers = bans.map(ban => {
          return new IUser(this._discordie, ban.user.id);
        });
        return rs(bannedUsers);
      })
      .catch(rj);
    });
  }

  /**
   * Makes a request to get estimate of members affected by prune request.
   *
   * Promise resolves with an Object with following structure:
   * ```js
   * {
   *   guildId: String,
   *   days: Number, // same as parameter passed
   *   estimate: Number
   * }
   * ```
   * @param {Number} days - Number of days from 1 to 7, default 1
   * @returns {Promise<Object, Error>}
   */
  getPruneEstimate(days) {
    return rest(this._discordie).guilds.prune.getPrune(this.id, days);
  }

  /**
   * Makes a request to prune members.
   *
   * Promise resolves with an Object with following structure:
   * ```js
   * {
   *   guildId: String,
   *   days: Number, // same as parameter passed
   *   pruned: Number
   * }
   * ```
   * @param {Number} days - Number of days from 1 to 7, default 1
   * @returns {Promise<Object, Error>}
   */
  pruneMembers(days) {
    // make it also accept object from .getPruneEstimate(days)
    if (days && days.hasOwnProperty("days")) {
      days = days.days;
    }
    return rest(this._discordie).guilds.prune.postPrune(this.id, days);
  }

  /**
   * Makes a request to get a list of invites of this guild.
   * @returns {Promise<Array<Object>, Error>}
   */
  getInvites() {
    return rest(this._discordie).guilds.getInvites(this.id);
  }

  /**
   * Makes a request to get a list of voice regions available for this guild.
   * @returns {Promise<Array<Object>, Error>}
   */
  fetchRegions() {
    return rest(this._discordie).voice.getRegions(this.id);
  }

  /**
   * Makes a request to transfer ownership of this guild to `user`.
   * @param {IGuildMember|IUser|String} user - User or an id string
   * @returns {Promise<IGuild, Error>}
   */
  transferOwnership(user) {
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .guilds.transferOwnership(this.id, user.valueOf())
        .then(() => rs(this))
        .catch(rj);
    });
  }

  /**
   * Makes a request to get widget (external embed) settings.
   *
   * Promise resolves with an Object with following structure:
   * ```js
   * {
   *   enabled: boolean,
   *   channel_id: String|null
   * }
   * ```
   * @return {Promise<Object, Error>}
   */
  getWidget() {
    return rest(this._discordie).guilds.getEmbed(this.id);
  }

  /**
   * Makes a request to set widget (external embed) settings.
   * @param {Object} options
   * Object `{enabled: boolean, channelId or channel_id: String}`.
   * Both options are optional.
   * @return {Promise<Object, Error>}
   */
  editWidget(options) {
    return rest(this._discordie).guilds.patchEmbed(this.id, options || {});
  }

  /**
   * Makes a request to fetch emojis for this guild.
   *
   * Only user and whitelisted bot accounts can use this endpoint.
   *
   * Promise resolves with an array of Objects with following structure:
   * ```js
   * {
   *   "managed": false,
   *   "name": 'abc',
   *   "roles": [],
   *   "user": {
   *     "username": "testuser",
   *     "discriminator": "3273",
   *     "id": "000000000000000000",
   *     "avatar": null
   *   },
   *   "require_colons": true,
   *   "id": "000000000000000000"
   * }
   * ```
   * @return {Promise<Array<Object>, Error>}
   */
  fetchEmoji() {
    return rest(this._discordie).guilds.emoji.getEmoji(this.id);
  }

  /**
   * Makes a request to create an emoji.
   *
   * Returned object does not contain `user` property.
   *
   * Only user and whitelisted bot accounts can use this endpoint.
   * @param {Buffer|String} image - Buffer or base64 image string
   * @param {String} name
   * @return {Promise<Object, Error>}
   */
  uploadEmoji(image, name) {
    if (image instanceof Buffer) {
      image = Utils.imageToDataURL(image);
    }

    return rest(this._discordie).guilds.emoji.postEmoji(this.id, image, name);
  }

  /**
   * Makes a request to delete the specified emoji.
   *
   * Only user and whitelisted bot accounts can use this endpoint.
   * @param {Object|String} emoji - Emoji object or an id string
   * @return {Promise<Object, Error>}
   */
  deleteEmoji(emoji) {
    if (emoji && emoji.id) emoji = emoji.id;

    return rest(this._discordie).guilds.emoji.deleteEmoji(this.id, emoji);
  }

  /**
   * Makes a request to edit the specified emoji.
   *
   * Returned object does not contain `user` property.
   *
   * Only user and whitelisted bot accounts can use this endpoint.
   * @param {Object|String} emoji - Emoji object or an id string
   * @param {Object} options
   * Optional properties to edit:
   * `{name: String, roles: Array<IRole>|Array<String>}`
   * @return {Promise<Object, Error>}
   */
  editEmoji(emoji, options) {
    if (emoji && emoji.id) emoji = emoji.id;
    if (!options) return Promise.resolve();

    options = Object.assign({}, options);

    const roles = options.roles;
    if (roles && !Array.isArray(roles)) {
      throw new TypeError("Param 'roles' must be an array");
    }
    if (Array.isArray(roles)) {
      options.roles = roles.filter(role => role).map(role => role.valueOf());
    }

    return rest(this._discordie)
      .guilds.emoji.patchEmoji(this.id, emoji, options);
  }

  /**
   * Creates a string URL of an emoji.
   * @returns {String|null}
   */
  getEmojiURL(emoji) {
    if (emoji && emoji.id) emoji = emoji.id;
    if (!emoji) return null;
    return Constants.CDN_ENDPOINT + Endpoints.CDN_EMOJI(emoji);
  }
}

IGuild._inherit(Guild, function modelPropertyGetter(key) {
  return this._discordie._guilds.get(this._guildId)[key];
});

/**
 * Creates an array of roles of this guild.
 * @readonly
 * @instance
 * @memberOf IGuild
 * @name roles
 * @returns {Array<IRole>}
 */
IGuild._setValueOverride("roles", function(rolesRaw) {
  const roles = [];
  if (!rolesRaw) return roles;
  for (let role of rolesRaw.values()) {
    roles.push(new IRole(this._discordie, role.id, this.id));
  }
  return roles;
});

module.exports = IGuild;

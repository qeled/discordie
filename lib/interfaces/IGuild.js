"use strict";

const Constants = require("../Constants");
const Endpoints = Constants.Endpoints;

const IBase = require("./IBase");
const IChannel = require("./IChannel");
const IGuildMember = require("./IGuildMember");
const IUser = require("./IUser");const IRole = require("./IRole");
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
    super(Guild, (key) => this._discordie._guilds.get(this._guildId)[key]);
    this._discordie = discordie;
    this._guildId = guildId;
    Utils.privatify(this);

    /**
     * @readonly
     * @instance
     * @memberOf IGuild
     * @name roles
     * @returns {Array<IRole>}
     */
    this._setValueOverride("roles", rolesRaw => {
      const roles = [];
      if (!rolesRaw) return roles;
      for (let role of rolesRaw.values()) {
        roles.push(new IRole(this._discordie, role.id, this.id));
      }
      return roles;
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
   * Creates a string url of image icon for this guild.
   * @returns {String}
   * @readonly
   */
  get iconURL() {
    if (!this.icon) return null;
    return Constants.API_ENDPOINT + Endpoints.GUILD_ICON(this.id, this.icon);
  }

  /**
   * Creates a string url of invite splash image for this guild.
   * @returns {String}
   * @readonly
   */
  get splashURL() {
    if (!this.splash) return null;
    return Constants.API_ENDPOINT + Endpoints.GUILD_SPLASH(this.id, this.splash);
  }

  /**
   * Checks whether the `user` is the owner of this guild.
   * @param {IGuildMember|IUser|IAuthenticatedUser} user
   * @returns {boolean}
   */
  isOwner(user) {
    if (!user) return false;
    if (!this.owner_id) return false;
    return this.owner_id === user.valueOf();
  }

  /**
   * Returns afk channel if this guild.
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
   * Returns null if user is not in cache.
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
   * Creates an array of text and voice channels for this guild.
   * @returns {Array<IChannel>}
   * @readonly
   */
  get channels() {
    return this._discordie.Channels.forGuild(this.id);
  }

  /**
   * Creates an array of text channels for this guild.
   * @returns {Array<ITextChannel>}
   * @readonly
   */
  get textChannels() {
    return this._discordie.Channels.textForGuild(this.id);
  }

  /**
   * Creates an array of voice channels for this guild.
   * @returns {Array<IVoiceChannel>}
   * @readonly
   */
  get voiceChannels() {
    return this._discordie.Channels.voiceForGuild(this.id);
  }

  /**
   * Returns general channel of this guild.
   * @returns {IChannel}
   * @readonly
   */
  get generalChannel() {
    return this._discordie.Channels.get(this.id);
  }

  /**
   * Makes a request to edit this guild,
   * substituting undefined properties with current values.
   * @param {String} [name]
   * @param {String|Buffer|null} [icon]
   * @param {String} [region]
   * @param {IChannel|String|null} [afkChannelId]
   * @param {Number} [afkTimeout] - 60, 300, 900, 1800 or 3600 seconds
   * @param {Number} [verificationLevel]
   * @returns {Promise<IGuild, Error>}
   */
  edit(name, icon, region, afkChannelId, afkTimeout, verificationLevel) {
    const guild = this._discordie._guilds.get(this._guildId);
    name = name || guild.name;
    region = region || guild.region;
    afkTimeout = afkTimeout || guild.afk_timeout;
    verificationLevel = verificationLevel || guild.verification_level;

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
          verificationLevel
        )
      .then(() => rs(this))
      .catch(rj);
    });
  }

  /**
   * Makes a request to create a channel in this guild.
   * @param {String} type - currently only "text" or "voice"
   * @param {String} name
   * @returns {Promise<IChannel, Error>}
   */
  createChannel(type, name) {
    return new Promise((rs, rj) => {
      rest(this._discordie).channels.createChannel(this.id, type, name)
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
   * Returns a rejected promise if the user **is** owner.
   * @returns {Promise}
   */
  leave() {
    if (this.owner.equals(this._discordie.User))
      return Promise.reject();
    return rest(this._discordie).guilds.leaveGuild(this.id);
  }

  /**
   * Makes a request to unban a user.
   * @param {IUser|String} user
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
   * @param {Number} days
   * @returns {Promise<Object, Error>} - {`guildId`, `days`, `estimate`}
   */
  getPruneEstimate(days) {
    return rest(this._discordie).guilds.prune.getPrune(this.id, days);
  }

  /**
   * Makes a request to prune members.
   * @param {Number} days
   * @returns {Promise<Object, Error>} - {`guildId`, `days`, `pruned`}
   */
  pruneMembers(days) {
    // make it also accept object from .getPruneEstimate(days)
    if (days && days.hasOwnProperty("days")) {
      days = days.days;
    }
    return rest(this._discordie).guilds.prune.postPrune(this.id, days);
  }

  /**
   * Makes a request to get a list of invites for this guild.
   * @returns {Promise<Array<Object>, Error>}
   */
  getInvites() {
    return rest(this._discordie).guilds.getInvites(this.id);
  }

  /**
   * Makes a request to get a list of voice regions for this guild.
   * @returns {Promise<Array<Object>, Error>}
   */
  fetchRegions() {
    return rest(this._discordie).voice.getRegions(this.id);
  }

  /**
   * Makes a request to transfer ownership of this guild to `user`.
   * @param {IGuildMember|IUser|String} user
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
}

module.exports = IGuild;

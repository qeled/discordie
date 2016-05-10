"use strict";

const IBase = require("./IBase");
const Utils = require("../core/Utils");
const Channel = require("../models/Channel");
const IUser = require("./IUser");
const IRole = require("./IRole");
const IGuildMember = require("./IGuildMember");
const IAuthenticatedUser = require("./IAuthenticatedUser");
const IPermissions = require("./IPermissions");
const IPermissionOverwrite = require("./IPermissionOverwrite");
const Constants = require("../Constants");
const ChannelTypes = Constants.ChannelTypes;

const rest = require("../networking/rest");

/**
 * @interface
 * @model Channel
 * @extends IBase
 * @description
 * Base channel class.
 *
 * Use the `type` property to determine whether it is a
 * `ITextChannel`, `IDirectMessageChannel` (`"text"`)
 * or `IVoiceChannel` (`"voice"`).
 */
class IChannel extends IBase {
  constructor(discordie, channelId) {
    super();
    Utils.definePrivate(this, {
      _discordie: discordie,
      _channelId: channelId
    });

    Object.freeze(this);
  }

  /**
   * Gets guild of this channel.
   * @returns {IGuild|null}
   * @readonly
   */
  get guild() {
    return this._discordie.Guilds.get(this.guild_id);
  }

  /**
   * Makes a request to create an invite for this channel.
   * @param {Object} options
   * @returns {Promise<Object, Error>}
   * @example
   * channel.createInvite({
   *   max_age: 60 * 60 * 24,
   *   // value in seconds
   *   max_uses: 0,
   *   // pretty obvious
   *   temporary: false,
   *   // temporary membership, kicks members without roles on disconnect
   *   xkcdpass: false
   *   // human readable
   * });
   * // Example response:
   * {
   *   "max_age": 86400,
   *   "code": "AAAAAAAAAAAAAAAA",
   *   "guild": {
   *     "id": "00000000000000000",
   *     "name": "test"
   *   },
   *   "revoked": false,
   *   "created_at": "2015-10-16T10:45:38.566978+00:00",
   *   "temporary": false,
   *   "uses": 0,
   *   "max_uses": 0,
   *   "inviter": {
   *     "username": "testuser",
   *     "discriminator": "3273",
   *     "id": "00000000000000000",
   *     "avatar": null
   *   },
   *   "xkcdpass": null,
   *   "channel": {
   *     "type": "text",
   *     "id": "000000000000000000",
   *     "name": "testchannel"
   *   }
   * }
   */
  createInvite(options) {
    return this._discordie.Invites.create(this, options);
  }

  /**
   * Makes a request to create a permission overwrite for this channel.
   * @param {IAuthenticatedUser|IRole|IGuildMember} roleOrMember
   * @param {IPermissions|Number} [allow]
   * @param {IPermissions|Number} [deny]
   * @returns {Promise<IPermissionOverwrite, Error>}
   * @example
   * channel.createPermissionOverwrite(this.User);
   * channel.createPermissionOverwrite(
   *   channel.guild.members.find(m => m.username == "testuser")
   * );
   * channel.createPermissionOverwrite(
   *   channel.guild.roles.find(r => r.name == "new role")
   * )
   * .then(overwrite => console.log(overwrite))
   * .catch(error => console.log(error));
   */
  createPermissionOverwrite(roleOrMember, allow, deny) {
    if (![IAuthenticatedUser, IRole, IGuildMember]
          .some(t => roleOrMember instanceof t))
      throw new TypeError(
        "roleOrMember must be an instance of IRole or IGuildMember"
      );

    if (allow === undefined) allow = 0;
    if (deny === undefined) deny = 0;
    if (allow instanceof IPermissions) allow = allow.raw;
    if (deny instanceof IPermissions) deny = deny.raw;
    const types = [
      {t: IRole, s: "role"},
      {t: IGuildMember, s: "member"},
      {t: IAuthenticatedUser, s: "member"}
    ];
    const type = types.find(spec => roleOrMember instanceof spec.t).s;

    return new Promise((rs, rj) => {
      const raw = {
        id: roleOrMember.valueOf(),
        type: type,
        allow: allow,
        deny: deny
      };
      rest(this._discordie)
        .channels.putPermissionOverwrite(this._channelId, raw)
      .then(o =>
        rs(new IPermissionOverwrite(this._discordie, o.id, this._channelId))
      )
      .catch(rj);
    });
  }

  /**
   * Makes a request to update this channel.
   * @param {String} [name]
   * @param {String} [topic]
   * @param {Number} [bitrate]
   * @returns {Promise<IChannel, Error>}
   */
  update(name, topic, bitrate) {
    if (typeof name !== "string") name = this.name;
    if (typeof topic !== "string") topic = this.topic;
    if (typeof bitrate !== "number") bitrate = this.bitrate;
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .channels.patchChannel(this.id, name, topic, bitrate, this.position)
      .then((channel) => rs(this._discordie.Channels.get(channel.id)))
      .catch(rj);
    });
  }

  /**
   * Makes a request to create a new channel with permission overwrites of
   * this channel.
   * @param {String} name
   * @param {String} [type] - Only "text" or "voice"
   * @param {Number} [bitrate]
   */
  clone(name, type, bitrate) {
    if (!this._valid) return Promise.reject("Invalid channel");
    if (!this.guild) return Promise.reject("Invalid guild");
    name = name || this.name;
    type = type || this.type;
    return this.guild
      .createChannel(type, name, this.permission_overwrites, bitrate);
  }

  /**
   * Moves this channel to `position` and makes a batch channel update request.
   * @param {Number} position
   * @returns {Promise}
   */
  setPosition(position) {
    const channels = (this.type == ChannelTypes.VOICE) ?
      this.guild.voiceChannels :
      this.guild.textChannels;

    const changes = Utils.reorderObjects(channels, this, position);
    if (!changes) return Promise.resolve();

    return rest(this._discordie)
      .channels.batchPatchChannels(this.guild_id, changes);
  }

  /**
   * Makes a request to delete this channel.
   * @returns {Promise}
   */
  delete() {
    return rest(this._discordie).channels.deleteChannel(this.id);
  }

  /**
   * Makes a request to get a list of invites for this channel.
   * @returns {Promise<Array<Object>, Error>}
   */
  getInvites() {
    return rest(this._discordie).channels.getInvites(this.id);
  }
}

IChannel._inherit(Channel, function modelPropertyGetter(key) {
  return this._discordie._channels.get(this._channelId)[key];
});

/**
 * @readonly
 * @instance
 * @memberOf IChannel
 * @name permission_overwrites
 * @returns {Array<IPermissionOverwrite>}
 */
IChannel._setValueOverride("permission_overwrites", function(overwritesRaw) {
  const overwrites = [];
  if (!overwritesRaw) return overwrites;
  for (let overwrite of overwritesRaw) {
    overwrites.push(new IPermissionOverwrite(
      this._discordie, overwrite.id, this._channelId
    ));
  }
  return overwrites;
});

module.exports = IChannel;

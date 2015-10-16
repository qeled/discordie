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

const rest = require("../networking/rest");

/**
 * @interface
 */
class IChannel extends IBase {
  constructor(discordie, channelId) {
    super(Channel, (key) =>
      this._discordie._channels.get(this._channelId)[key]
    );
    this._discordie = discordie;
    this._channelId = channelId;
    Utils.privatify(this);

    this._setValueOverride("permission_overwrites", overwritesRaw => {
      const overwrites = [];
      if (!overwritesRaw) return overwrites;
      for (let overwrite of overwritesRaw) {
        overwrites.push(new IPermissionOverwrite(
          this._discordie, overwrite.id, this._channelId
        ));
      }
      return overwrites;
    });

    Object.freeze(this);
  }

  /**
   * Gets guild of the channel.
   * @returns {IGuild}
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
   * @param {IPermissions|Number} allow - optional
   * @param {IPermissions|Number} deny - optional
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
      {t: IAuthenticatedUser, s: "member"},
    ];
    const type = types.find(spec => roleOrMember instanceof spec.t).s;

    return new Promise((rs, rj) => {
      const raw = {
        id: roleOrMember.valueOf(),
        type: type,
        allow: allow,
        deny: deny,
      }
      rest(this._discordie)
        .channels.putPermissionOverwrite(this._channelId, raw)
      .then(o =>
        rs(new IPermissionOverwrite(this._discordie, o.id, this._channelId))
      )
      .catch(rj);
    });
  }

  // todo: channel reordering and docs
  update(name, topic) {
    if (typeof name !== "string") name = this.name;
    if (typeof topic !== "string") topic = this.topic;
    if (typeof position !== "number") position = this.position;
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .channels.patchChannel(this.id, name, topic, position)
      .then((channel) => rs(this._discordie.Channels.get(channel.id)))
      .catch(rj);
    });
  }

  /**
   * Makes a request to delete this channel.
   * @returns {Promise}
   */
  delete() {
    // todo: check permissions
    return rest(this._discordie).channels.deleteChannel(this.id);
  }
}

module.exports = IChannel;

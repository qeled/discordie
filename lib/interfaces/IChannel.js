"use strict";

const IBase = require("./IBase");
const Utils = require("../core/Utils");
const Channel = require("../models/Channel");
const IUser = require("./IUser");
const IRole = require("./IRole");
const IGuildMember = require("./IGuildMember");
const IAuthenticatedUser = require("./IAuthenticatedUser");
const IPermissionOverwrite = require("./IPermissionOverwrite");

const rest = require("../networking/rest");

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
  get guild() {
    return this._discordie.Guilds.get(this.guild_id);
  }
  createInvite(options) {
    return this._discordie.Invites.create(this, options);
  }
  createPermissionOverwrite(roleOrMember, allow, deny) {
    if (![IAuthenticatedUser, IRole, IGuildMember]
          .some(t => roleOrMember instanceof t))
      throw new TypeError(
        "roleOrMember must be an instance of IRole or IGuildMember"
      );

    if (allow === undefined) allow = 0;
    if (deny === undefined) deny = 0;
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
      .then(rs)
      .catch(rj);
    });
  }
  update(name, topic, position) {
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
  delete() {
    // todo: check permissions
    return rest(this._discordie).channels.deleteChannel(this.id);
  }
}

module.exports = IChannel;

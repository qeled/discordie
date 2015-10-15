"use strict";

const IBase = require("./IBase");
const Utils = require("../core/Utils");
const Channel = require("../models/Channel");
const IUser = require("./IUser");
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
      if (!overwritesRaw) return roles;
      for (let overwrite of overwritesRaw) {
        roles.push(new IPermissionOverwrite(
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
  update(name, topic, position) {
    if (typeof name !== "string") name = this.name;
    if (typeof topic !== "string") topic = this.topic;
    if (typeof position !== "number") position = this.position;
    return new Promise((rs, rj) => {
      rest(this._discordie).channels.patchChannel(this.id, name, topic, position)
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

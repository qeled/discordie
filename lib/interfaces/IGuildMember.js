"use strict";

const IBase = require("./IBase");
const IUser = require("./IUser");
const GuildMember = require("../models/GuildMember");
const Utils = require("../core/Utils");

const rest = require("../networking/rest");

class IGuildMember extends IUser {
  constructor(discordie, userId, guildId) {
    super(discordie, userId, guildId);
    this._guildId = guildId;
    this._inherit(GuildMember, (key) =>
      this._discordie._members.getMember(this._guildId, this._userId)[key]
    );
    Utils.privatify(this);
    Object.freeze(this);
  }
  get guild() {
    return this._discordie.Guilds.get(this._guildId);
  }
  get roles() {

  }
  kick() {
    return rest(this._discordie).guilds.members.kickMember(this._guildId, this.id);
  }
  ban(deleteMessageForDays) {
    return rest(this._discordie).guilds.bans.banMember(this._guildId, this.id, deleteMessageForDays);
  }
  unban() {
    return this.guild.unban(this.id);
  }
  serverMute(mute) {
    if (typeof mute === "undefined") mute = true;
    if (mute == this.mute) return Promise.resolve();
    return rest(this._discordie).guilds.members.setMute(this._guildId, this.id, mute);
  }
  serverUnmute() {
    return this.serverMute(false);
  }
  serverDeafen(deaf) {
    if (typeof deaf === "undefined") deaf = true;
    if (deaf == this.deaf) return Promise.resolve();
    return rest(this._discordie).guilds.members.setDeaf(this._guildId, this.id, deaf);
  }
  serverUndeafen() {
    return this.serverDeafen(false);
  }
  can(channel, permission) {
    channel = channel.valueOf();

  }
  hasRole(role) {
    role = role.valueOf();
    //role->IRole
  }
}

module.exports = IGuildMember;

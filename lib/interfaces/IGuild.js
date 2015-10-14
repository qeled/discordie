"use strict";

const Constants = require("../Constants");
const Endpoints = Constants.Endpoints;

const IBase = require("./IBase");
const IGuildMember = require("./IGuildMember");
const IRole = require("./IRole");
const Utils = require("../core/Utils");
const Guild = require("../models/Guild");

const rest = require("../networking/rest");

class IGuild extends IBase {
  constructor(discordie, guildId) {
    super(Guild, (key) => this._discordie._guilds.get(this._guildId)[key]);

    this._setValueOverride("roles", rolesRaw => {
      const roles = [];
      if (!rolesRaw) return roles;
      for (let role of rolesRaw.values()) {
        roles.push(new IRole(this._discordie, role.id, this.id));
      }
      return roles;
    });

    this._discordie = discordie;
    this._guildId = guildId;
    Utils.privatify(this);
    Object.freeze(this);
  }
  get acronym() {
    if (!this.name) return "";
    return this.name.replace(/\w+/g, match => match[0]).replace(/\s/g, "");
  }
  get iconURL() {
    if (!this.icon) return null;
    return Constants.API_ENDPOINT + Endpoints.GUILD_ICON(this.id, this.icon);
  }
  isOwner(user) {
    if (!user) return false;
    if (!this.owner) return false;
    return this.owner.equals(user);
  }

  get afk_channel() {
    if (!this.afk_channel_id) return null;
    const afk_channel = this._discordie.Channels.get(this.afk_channel_id);
    return afk_channel ? afk_channel : null;
  }
  get owner() {
    if (!this.owner_id) return null;
    const owner = this._discordie.Users.get(this.owner_id);
    return owner ? owner : null;
  }

  get channels() {
    return this._discordie.Channels.forGuild(this.id);
  }
  get textChannels() {
    return this._discordie.Channels.textForGuild(this.id);
  }
  get voiceChannels() {
    return this._discordie.Channels.voiceForGuild(this.id);
  }
  get generalChannel() {
    return this._discordie.Channels.get(this.id);
  }

  createChannel(type, name) {
    return new Promise((rs, rj) => {
      rest(this._discordie).channels.createChannel(this.id, type, name)
      .then((channel) => rs(this._discordie.Channels.get(channel.id)))
      .catch (rj);
    });
  }
  createInvite(options) {
    return this._discordie.Invites.create(this.generalChannel, options);
  }
  get members() {
    return this._discordie.Users.membersForGuild(this.id);
  }
  delete() {
    if (!this.owner.equals(this._discordie.User))
      return Promise.reject();
    return rest(this._discordie).guilds.deleteGuild(this.id);
  }
  leave() {
    if (this.owner.equals(this._discordie.User))
      return Promise.reject();
    return rest(this._discordie).guilds.deleteGuild(this.id);
  }

  unban(userId) {
    return rest(this._discordie).guilds.bans.unbanMember(this.id, userId);
  }
  getBans() {
    return new Promise((rs, rj) => {
      rest(this._discordie).guilds.bans.getBans(this.id)
      .then((bans) => {
        const bannedMembers = bans.map(ban => {
          return new IGuildMember(this._discordie, ban.user.id, this.id);
        });
        rs(bannedMembers);
      })
      .catch (rj);
    });
  }
}

module.exports = IGuild;

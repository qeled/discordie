"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");

const Guild = require("../models/Guild");
const Role = require("../models/Role");

function convertRoles(roles) {
  const map = new Map();
  roles.forEach(role => {
    map.set(role.id, new Role(role));
  });
  return map;
}

function createGuild(guild, old) {
  return new Guild({
    id: guild.id,
    name: guild.name,
    region: guild.region,
    icon: guild.icon,
    splash: guild.splash,
    features: new Set(guild.features),
    emojis: (guild.emojis != null ? guild.emojis : old.emojis) || [],
    owner_id: guild.owner_id,
    roles: convertRoles(guild.roles),
    afk_channel_id: guild.afk_channel_id,
    afk_timeout: guild.afk_timeout,
    verification_level: guild.verification_level,
    embed_enabled: guild.embed_enabled || false,
    embed_channel_id: guild.embed_channel_id || null,
    member_count:
      (guild.member_count != null ? guild.member_count : old.member_count),
    large: (guild.large != null ? guild.large : old.large) || false,
    mfa_level: guild.mfa_level,
    joined_at: guild.joined_at || old.joined_at
  });
}

function handleConnectionOpen(data) {
  this.clear();
  data.guilds.forEach(guild => {
    if (guild.unavailable) return;
    this.set(guild.id, createGuild(guild, {}));
  });
  return true;
}

function handleCreateOrUpdateGuild(guild) {
  if (!guild || guild.unavailable) return true;
  const old = this.get(guild.id) || {};
  this.mergeOrSet(guild.id, createGuild(guild, old));
  return true;
}

function handleDeleteGuild(guild) {
  this.delete(guild.id);
  return true;
}

function handleGuildSync(guild) {
  let oldGuild = this.get(guild.id);
  if (!oldGuild) return true;
  this.mergeOrSet(guild.id, {
    large: (guild.large != null ? guild.large : oldGuild.large)
  });
  return true;
}

function handleGuildRoleCreateOrUpdate(data) {
  let guild = this.get(data.guild_id);
  if (guild)
    guild.roles.set(data.role.id, new Role(data.role));
  return true;
}

function handleGuildRoleDelete(data) {
  let guild = this.get(data.guild_id);
  if (guild)
    guild.roles.delete(data.role_id);
  return true;
}

function handleGuildMemberAdd(member) {
  updateMemberCount.call(this, member.guild_id, +1);
  return true;
}

function handleGuildMemberRemove(member) {
  updateMemberCount.call(this, member.guild_id, -1);
  return true;
}

function updateMemberCount(guildId, delta) {
  let guild = this.get(guildId);
  if (!guild) return true;
  this.mergeOrSet(guildId, { member_count: guild.member_count + delta });
  return true;
}

function handleGuildEmojisUpdate(data) {
  if (!data || data.emojis == null) return true;

  let guild = this.get(data.guild_id);
  if (!guild) return true;

  this.mergeOrSet(data.guild_id, { emojis: data.emojis });
  return true;
}

class GuildCollection extends BaseCollection {
  constructor(discordie, gateway) {
    super();

    if (typeof gateway !== "function")
      throw new Error("Gateway parameter must be a function");

    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      if (e.socket != gateway()) return;

      Utils.bindGatewayEventHandlers(this, e, {
        READY: handleConnectionOpen,
        GUILD_SYNC: handleGuildSync,
        GUILD_CREATE: handleCreateOrUpdateGuild,
        GUILD_UPDATE: handleCreateOrUpdateGuild,
        GUILD_DELETE: handleDeleteGuild,
        GUILD_ROLE_CREATE: handleGuildRoleCreateOrUpdate,
        GUILD_ROLE_UPDATE: handleGuildRoleCreateOrUpdate,
        GUILD_ROLE_DELETE: handleGuildRoleDelete,
        GUILD_MEMBER_ADD: handleGuildMemberAdd,
        GUILD_MEMBER_REMOVE: handleGuildMemberRemove,
        GUILD_EMOJIS_UPDATE: handleGuildEmojisUpdate,
      });
    });

    this._discordie = discordie;
    Utils.privatify(this);
  }
  update(guild) {
    handleCreateOrUpdateGuild.call(this, guild);
  }
  updateRole(guildId, role) {
    const guild = this.get(guildId);
    if (!guild || !guild.roles) return;
    guild.roles.set(role.id, new Role(role));
  }
}

module.exports = GuildCollection;

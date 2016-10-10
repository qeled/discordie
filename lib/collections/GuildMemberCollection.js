"use strict";

const Constants = require("../Constants");
const StatusTypes = Constants.StatusTypes;
const Events = Constants.Events;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");

const GuildMember = require("../models/GuildMember");

function createGuildMember(member) {
  if (member.user) member.id = member.user.id;

  return new GuildMember({
    id: member.id,
    guild_id: member.guild_id,
    nick: member.nick || null,
    roles: member.roles || [],
    mute: member.mute || false,
    deaf: member.deaf || false,
    self_mute: member.self_mute || false,
    self_deaf: member.self_deaf || false,
    joined_at: member.joined_at
  });
}

function handleConnectionOpen(data) {
  this.clear();
  data.guilds.forEach(guild => handleCreateGuild.call(this, guild));
  return true;
}

function handleGuildMemberCreateOrUpdate(member, e) {
  const memberCollection = this.get(member.guild_id);
  if (!memberCollection) return true;

  const prev = memberCollection.get(member.user.id);
  const next = createGuildMember(member);
  memberCollection.mergeOrSet(member.user.id, next);

  if (e.type === Events.GUILD_MEMBER_UPDATE) {
    e.data._prev = prev;
    e.data._next = next;
  }

  return true;
}

function handleGuildMemberRemove(member, e) {
  const memberCollection = this.get(member.guild_id);
  if (!memberCollection) return true;

  const oldMember = memberCollection.get(member.user.id);
  if (oldMember) e.data._cached = oldMember;

  memberCollection.delete(member.user.id);
  return true;
}

function handleCreateGuild(guild) {
  if (!guild || guild.unavailable) return true;

  if (!this._discordie._guilds.get(guild.id)) return true; // GUILD_SYNC case

  const memberCollection = new BaseCollection();
  this.set(guild.id, memberCollection);

  guild.members.forEach(member => {
    member.guild_id = guild.id;
    memberCollection.set(member.user.id, createGuildMember(member));
  });
  return true;
}

function handleDeleteGuild(guild) {
  this.delete(guild.id);
  return true;
}

function handleVoiceStateUpdate(data) {
  const memberCollection = this.get(data.guild_id);
  if (!memberCollection) return true;
  const member = memberCollection.get(data.user_id);
  if (!member) return true;
  memberCollection.set(data.user_id,
    member.merge({
      mute: data.mute,
      deaf: data.deaf,
      self_mute: data.self_mute,
      self_deaf: data.self_deaf
    })
  );
  return true;
}

function handlePresenceUpdate(presence) {
  if (!presence.user || !presence.user.id) return true;

  // add members only for online users and if presence is not partial
  if (presence.status == StatusTypes.OFFLINE || !presence.user.username)
    return true;

  const memberCollection = this.get(presence.guild_id);
  if (!memberCollection) return true;

  const cachedMember = memberCollection.get(presence.user.id);
  if (!cachedMember) {
    // note: presences only contain roles
    memberCollection.set(presence.user.id, createGuildMember(presence));
  }

  return true;
}

function handleGuildMembersChunk(chunk) {
  var guildId = chunk.guild_id;
  if (!guildId || !chunk.members) return true;

  var state = this._guildMemberChunks[guildId];
  if (!state) return true;

  var guild = this._discordie._guilds.get(guildId);
  if (!guild) return true;

  const memberCollection = this.get(guildId);
  if (!memberCollection) return true;

  chunk.members.forEach(member => {
    member.guild_id = guildId;
    memberCollection.mergeOrSet(member.user.id, createGuildMember(member))
  });
  if (memberCollection.size >= guild.member_count) state.resolve();

  return true;
}

class GuildMemberCollection extends BaseCollection {
  constructor(discordie, gateway) {
    super();

    if (typeof gateway !== "function")
      throw new Error("Gateway parameter must be a function");

    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      if (e.socket != gateway()) return;

      Utils.bindGatewayEventHandlers(this, e, {
        READY: handleConnectionOpen,
        GUILD_SYNC: handleCreateGuild,
        GUILD_CREATE: handleCreateGuild,
        GUILD_DELETE: handleDeleteGuild,
        GUILD_MEMBER_ADD: handleGuildMemberCreateOrUpdate,
        GUILD_MEMBER_UPDATE: handleGuildMemberCreateOrUpdate,
        GUILD_MEMBER_REMOVE: handleGuildMemberRemove,
        VOICE_STATE_UPDATE: handleVoiceStateUpdate,
        PRESENCE_UPDATE: handlePresenceUpdate,
        GUILD_MEMBERS_CHUNK: handleGuildMembersChunk
      });
    });

    discordie.Dispatcher.on(Events.GATEWAY_DISCONNECT, e => {
      if (e.socket != gateway()) return;

      for (var guildId in this._guildMemberChunks) {
        var state = this._guildMemberChunks[guildId];
        if (!state) continue;
        state.reject(new Error("Gateway disconnect"));
      }
      this._guildMemberChunks = {};
    });

    this._guildMemberChunks = {};

    this._discordie = discordie;
    Utils.privatify(this);
  }
  fetchMembers(guilds){
    const gateway = this._discordie.gatewaySocket;
    if (!gateway || !gateway.connected)
      return Promise.reject(new Error("No gateway socket (not connected)"));

    const largeGuilds =
      Array.from(this._discordie._guilds.values())
        .filter(guild => {
          if (!guild.large) return false;
          var cachedMembers = this._discordie._members.get(guild.id);
          if (!cachedMembers) return false;
          return guild.member_count > cachedMembers.size;
        })
        .map(guild => guild.id);

    // filter out only requested guilds (if specified) from large ones
    // return a resolved promise if no large guilds in the list
    let targetGuilds =
      !guilds ?
        largeGuilds :
        largeGuilds.filter(guild => guilds.indexOf(guild) >= 0);

    if (!targetGuilds.length) return Promise.resolve();

    targetGuilds.forEach(guildId => {
      if (this._guildMemberChunks[guildId]) return;

      var state = {promise: null, resolve: null, reject: null, timer: null};
      state.promise = new Promise((rs, rj) => {
        const destroyState = () => {
          if (!state.timer) return;
          clearTimeout(state.timer);
          state.timer = null;
          delete this._guildMemberChunks[guildId];
        };
        state.resolve = result => { destroyState(); return rs(result); };
        state.reject = reason => { destroyState(); return rj(reason); };
      });
      state.timer = setTimeout(() => {
        if (!this._guildMemberChunks[guildId]) return;
        state.reject(new Error(
          "Guild member request timed out (" + guildId + ")"
        ));
        delete this._guildMemberChunks[guildId];
      }, 60000);
      this._guildMemberChunks[guildId] = state;
    });

    gateway.requestGuildMembers(targetGuilds);

    var targetPromises =
      targetGuilds.map(guildId => this._guildMemberChunks[guildId].promise);

    return Promise.all(targetPromises);
  }
  getMember(guildId, userId) {
    const memberCollection = this.get(guildId);
    if (!memberCollection) return null;
    return memberCollection.get(userId);
  }
}

module.exports = GuildMemberCollection;

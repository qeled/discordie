"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");

const User = require("../models/User");
const AuthenticatedUser = require("../models/AuthenticatedUser");

function handleConnectionOpen(data) {
  this.clear();
  this.set(data.user.id, new AuthenticatedUser(data.user));

  data.guilds.forEach(guild => {
    if (guild.unavailable) return;
    guild.members.forEach(member => {
      if (member.user.id == data.user.id) return;
      this.set(member.user.id, new User(member.user));
    });
  });

  data.private_channels.forEach(channel => {
    if (!channel.recipient) return;
    this.set(channel.recipient.id, channel.recipient);
  });

  return true;
}

function handleUpdateUser(user) {
  const cachedUser = this._discordie._user;
  delete user.token;
  this._discordie._user = new AuthenticatedUser(
    cachedUser ? cachedUser.merge(user) : user
  );
  this.mergeOrSet(user.id, this._discordie._user);
  return true;
}

function handleLoadedMoreMessages(e) {
  e.messages.forEach(message => {
    this.mergeOrSet(message.author.id, new User(message.author));
    message.mentions.forEach(mention => {
      this.mergeOrSet(mention.id, new User(mention));
    });
  });
  return true;
}

function handleIncomingMessage(message) {
  if (message.author) {
    this.mergeOrSet(message.author.id, new User(message.author));
  }
  if (message.mentions) {
    message.mentions.forEach(mention => {
      this.mergeOrSet(mention.id, new User(mention));
    });
  }
  return true;
}

function handleCreateOrUpdateChannel(channel) {
  if (channel.recipient) {
    this.mergeOrSet(channel.recipient.id, new User(channel.recipient));
  }
  return true;
}

function handlePresenceUpdate(presence, e) {
  if (!presence.user || !presence.user.id) return true;

  const cachedUser = this.get(presence.user.id);
  if (!cachedUser) {
    // update 2015-10-22:
    //   Discord client now creates local GUILD_MEMBER_ADD event
    // update 2015-12-01:
    //   Discord client creates local GUILD_MEMBER_ADD event only for
    //   online users with `user.username != null`
    this.set(presence.user.id, new User(presence.user));
    return true;
  }

  const replacer = (hasChanges, key) => {
    if (presence.user.hasOwnProperty(key)) {
      hasChanges = hasChanges ||
        (cachedUser[key] != presence.user[key]);
    }
    return hasChanges;
  };
  const hasChanges =
    ["username", "avatar", "discriminator"].reduce(replacer, false);

  if (hasChanges) {
    const oldUser = this.get(cachedUser.id);
    this.mergeOrSet(cachedUser.id, new User(presence.user));
    const newUser = this.get(cachedUser.id);

    this._discordie.Dispatcher.emit(Events.PRESENCE_MEMBER_INFO_UPDATE, {
      socket: e.socket,
      old: oldUser,
      new: newUser
    });
  }

  return true;
}

function handleLoadedGuildBans(bans) {
  bans.forEach(ban => {
    this.mergeOrSet(ban.user.id, new User(ban.user));
  });
}

function handleBanOrMember(member) {
  this.mergeOrSet(member.user.id, new User(member.user));
  return true;
}

function handleGuildCreate(guild) {
  if (!guild || guild.unavailable) return true;
  guild.members.forEach(member => {
    if (this._discordie._user.id == member.user.id) return;
    this.mergeOrSet(member.user.id, new User(member.user));
  });
  return true;
}

function handleGuildMembersChunk(chunk) {
  if (!chunk.members) return true;
  handleGuildCreate.call(this, chunk);
}

class UserCollection extends BaseCollection {
  constructor(discordie, gateway) {
    super();

    if (typeof gateway !== "function")
      throw new Error("Gateway parameter must be a function");

    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      if (e.socket != gateway()) return;

      Utils.bindGatewayEventHandlers(this, e, {
        READY: handleConnectionOpen,
        USER_UPDATE: handleUpdateUser,
        PRESENCE_UPDATE: handlePresenceUpdate,
        MESSAGE_CREATE: handleIncomingMessage,
        GUILD_CREATE: handleGuildCreate,
        GUILD_BAN_ADD: handleBanOrMember,
        GUILD_BAN_REMOVE: handleBanOrMember,
        GUILD_MEMBER_ADD: handleBanOrMember,
        GUILD_MEMBER_REMOVE: handleBanOrMember,
        CHANNEL_CREATE: handleCreateOrUpdateChannel,
        CHANNEL_UPDATE: handleCreateOrUpdateChannel,
        GUILD_MEMBERS_CHUNK: handleGuildMembersChunk
      });
    });

    discordie.Dispatcher.on(Events.LOADED_MORE_MESSAGES,
      handleLoadedMoreMessages.bind(this));

    discordie.Dispatcher.on(Events.LOADED_GUILD_BANS,
      handleLoadedGuildBans.bind(this));

    this._discordie = discordie;
    Utils.privatify(this);
  }
  updateAuthenticatedUser(user) {
    handleUpdateUser.call(this, user);
  }
  update(user) {
    this.mergeOrSet(user.id, new User(user));
  }
}

module.exports = UserCollection;

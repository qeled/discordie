"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const StatusTypes = Constants.StatusTypes;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");

const User = require("../models/User");

function updatePresence(guildId, userId, status, gameId) {
  if (userId === this._discordie._user.id) return;

  let previousPresence = {
    status: this._statuses[userId],
    gameId: this._games[userId]
  };

  let presencesForUser =
    (this._presencesForGuilds[userId] =
    this._presencesForGuilds[userId] || {});

  if (status === StatusTypes.OFFLINE) {
    delete presencesForUser[guildId];
    if (!Object.keys(presencesForUser).length) {
      delete this._presencesForGuilds[userId];
    }
    delete this._statuses[userId];
    delete this._games[userId];
  } else {
    presencesForUser[guildId] = {status, gameId};
    this._statuses[userId] = StatusTypes.IDLE;
    this._games[userId] = null;
    for (let guildId of Object.keys(this._presencesForGuilds[userId])) {
      const presence = this._presencesForGuilds[userId][guildId];
      if (presence.status === StatusTypes.ONLINE) {
        this._statuses[userId] = StatusTypes.ONLINE;
      }
      if (presence.gameId) {
        //this._games[userId] = Games.nameForId(presence.gameId);
        // ^ move to IUser.getGameName()
        this._games[userId] = presence.gameId;
        // todo: gamesLoader
      }
    }
  }

  this._previousPresences[userId] = previousPresence;
  if (!previousPresence.status) {
    delete this._previousPresences[userId];
  }
}

function initializeCache() {
  this._presencesForGuilds = {};
  this._previousPresences = {};
  this._statuses = {};
  this._games = {};
}

function handleConnectionOpen(data) {
  initializeCache.call(this);
  data.guilds.forEach(guild => handleGuildCreate.call(this, guild));
}

function handleGuildCreate(guild) {
  guild.presences.forEach(presence => {
    updatePresence.call(this,
      guild.id,
      presence.user.id,
      presence.status,
      presence.gameId
    );
  });
}

function handleGuildDelete(guild) {
  for (let userId of Object.keys(this._presencesForGuilds)) {
    if (!this._presencesForGuilds[userId][guild.id]) continue;
    updatePresence.call(this, guild.id, userId, StatusTypes.OFFLINE, null);
  }
}

function handleGuildMemberRemove(member) {
  updatePresence.call(this,
    member.guild_id,
    member.user.id,
    StatusTypes.OFFLINE,
    null
  );
}

function handlePresenceUpdate(presence) {
  updatePresence.call(this,
    presence.guild_id,
    presence.user.id,
    presence.status,
    presence.game_id
  );
}

class PresenceCollection {
  constructor(discordie, gateway) {
    if (typeof gateway !== "function")
      throw new Error("Gateway parameter must be a function");

    discordie.Dispatcher.on(Events.GATEWAY_READY, e => {
      if (e.socket != gateway()) return;
      (handleConnectionOpen.bind(this))(e.data);
    });
    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      if (e.socket != gateway()) return;

      Utils.bindGatewayEventHandlers(this, e, {
        GUILD_CREATE: handleGuildCreate,
        GUILD_DELETE: handleGuildDelete,
        GUILD_MEMBER_REMOVE: handleGuildMemberRemove,
        PRESENCE_UPDATE: handlePresenceUpdate
      });
    });

    initializeCache.call(this);

    this._discordie = discordie;
    Utils.privatify(this);
  }
  getStatus(userId) {
    if (this._discordie._user && this._discordie._user.id == userId) {
      return this._discordie._user.status;
    }
    if (this._statuses.hasOwnProperty(userId)) {
      return this._statuses[userId];
    }
    return StatusTypes.OFFLINE;
  }
  getPreviousStatus(userId) {
    if (this._previousPresences.hasOwnProperty(userId)) {
      return this._previousPresences[userId].status;
    }
    return StatusTypes.OFFLINE;
  }
  getGame(userId) {
    if (this._discordie._user && this._discordie._user.id == userId) {
      return this._discordie._user.gameId;
    }
    if (this._games.hasOwnProperty(userId)) {
      return this._games[userId];
    }
    return null;
  }
  getPreviousGame(userId) {
    if (this._previousPresences.hasOwnProperty(userId)) {
      return this._previousPresences[userId].gameId;
    }
    return null;
  }
}

module.exports = PresenceCollection;

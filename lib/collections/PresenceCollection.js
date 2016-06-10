"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const StatusTypes = Constants.StatusTypes;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");

const User = require("../models/User");

function updatePresence(guildId, userId, status, game) {
  if (userId === this._discordie._user.id) return;

  // ignore friend list presences (without `guild_id`)
  if (!guildId) return;

  // get presences in all guilds
  var presencesForUser =
    (this._presencesForGuilds[userId] =
      this._presencesForGuilds[userId] || {});

  var previousPresencesForUser =
    (this._previousPresencesForGuilds[userId] =
      this._previousPresencesForGuilds[userId] || {});

  var previousPresence = presencesForUser[guildId];

  // copy current to previous
  previousPresencesForUser[guildId] =
    Object.assign(previousPresencesForUser[guildId] || {}, previousPresence);

  if (!previousPresence)
    delete previousPresencesForUser[guildId];

  if (status === StatusTypes.OFFLINE) {
    // delete current presence cache if user is not online anymore
    delete presencesForUser[guildId];
    if (!Object.keys(presencesForUser).length) {
      delete this._presencesForGuilds[userId];
    }
    delete this._statuses[userId];
    delete this._games[userId];
  } else {
    // set current presence
    presencesForUser[guildId] = {status, game};

    // update global status and game (for user statuses in DM list)
    this._statuses[userId] = status;
    this._games[userId] = game || null;
  }
}

function initializeCache() {
  this._presencesForGuilds = {};
  this._previousPresencesForGuilds = {};
  this._statuses = {};
  this._games = {};
}

function handleConnectionOpen(data) {
  initializeCache.call(this);
  data.guilds.forEach(guild => handleGuildCreate.call(this, guild));
  return true;
}

function handleGuildCreate(guild) {
  if (!guild || guild.unavailable) return true;
  guild.presences.forEach(presence => {
    updatePresence.call(this,
      guild.id,
      presence.user.id,
      presence.status,
      presence.game
    );
  });
  return true;
}

function handleGuildDelete(guild) {
  for (let userId of Object.keys(this._presencesForGuilds)) {
    if (!this._presencesForGuilds[userId][guild.id]) continue;
    updatePresence.call(this, guild.id, userId, StatusTypes.OFFLINE, null);
  }
  return true;
}

function handlePresenceUpdate(presence) {
  updatePresence.call(this,
    presence.guild_id,
    presence.user.id,
    presence.status,
    presence.game
  );
  return true;
}

function getPresence(collection, userId, guildId) {
  if (collection.hasOwnProperty(userId)) {
    const presencesForUser = collection[userId];
    guildId = guildId || Object.keys(presencesForUser)[0];
    if (presencesForUser.hasOwnProperty(guildId)) {
      return presencesForUser[guildId];
    }
  }
  return null;
}

class PresenceCollection {
  constructor(discordie, gateway) {
    if (typeof gateway !== "function")
      throw new Error("Gateway parameter must be a function");

    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      if (e.socket != gateway()) return;

      Utils.bindGatewayEventHandlers(this, e, {
        READY: handleConnectionOpen,
        GUILD_SYNC: handleGuildCreate,
        GUILD_CREATE: handleGuildCreate,
        GUILD_DELETE: handleGuildDelete,
        PRESENCE_UPDATE: handlePresenceUpdate
      });
    });

    initializeCache.call(this);

    this._discordie = discordie;
    Utils.privatify(this);
  }
  getStatus(userId, guildId) {
    if (this._discordie._user && this._discordie._user.id == userId) {
      return this._discordie._user.status;
    }
    const presence = getPresence.call(this,
      this._presencesForGuilds, userId, guildId
    ) || {};
    return presence.status || StatusTypes.OFFLINE;
  }
  getPreviousStatus(userId, guildId) {
    const presence = getPresence.call(this,
      this._previousPresencesForGuilds, userId, guildId
    ) || {};
    return presence.status || StatusTypes.OFFLINE;
  }
  getGame(userId, guildId) {
    if (this._discordie._user && this._discordie._user.id == userId) {
      return this._discordie._user.game;
    }
    const presence = getPresence.call(this,
      this._presencesForGuilds, userId, guildId
    ) || {};
    return presence.game || null;
  }
  getPreviousGame(userId, guildId) {
    const presence = getPresence.call(this,
      this._previousPresencesForGuilds, userId, guildId
    ) || {};
    return presence.game || null;
  }
}

module.exports = PresenceCollection;

"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const Utils = require("../core/Utils");
const BaseArrayCollection = require("./BaseArrayCollection");

const GUILD_STREAMING_TIMEOUT = 3000;

function emitReady(gw) {
  const timedOut = Array.from(this._streamingGuilds);
  this._streamingGuilds.clear();

  this._discordie.Dispatcher.emit(Events.COLLECTION_READY, {
    socket: gw,
    name: this.constructor.name,
    collection: this
  });

  if (!timedOut.length) return;
  timedOut.forEach(id => {
    this._discordie.Dispatcher.emit(Events.GUILD_UNAVAILABLE, {
      socket: gw,
      guildId: id
    });
  });
}

function scheduleReadyTimeout(gw) {
  this._streamingGuildsTimeout = setTimeout(() => {
    this._streamingGuildsTimeout = null;
    if (!this._discordie.connected) return;

    setImmediate(() => emitReady.call(this, gw));
  }, GUILD_STREAMING_TIMEOUT);
}

function maybeReady(gw) {
  if (this._streamingGuildsTimeout) {
    clearTimeout(this._streamingGuildsTimeout);
  }
  if (this._streamingGuilds.size) {
    scheduleReadyTimeout.call(this, gw);
  } else {
    setImmediate(() => emitReady.call(this, gw));
  }
}

function handleConnectionOpen(data, e) {
  clearCollections.call(this);

  data.guilds.forEach(guild => {
    if (!guild.unavailable) return;
    addUnavailable.call(this, guild.id);
    this._streamingGuilds.add(guild.id);
  });

  maybeReady.call(this, e.socket);
  return true;
}

function handleGuildCreate(guild, e) {
  handleUnavailable.call(this, guild);

  if (this.isGuildAvailable(guild) && this._streamingGuilds.has(guild.id)) {
    e.suppress = true;
    this._streamingGuilds.delete(guild.id);

    maybeReady.call(this, e.socket);
  }
  return true;
}

function handleGuildDelete(guild) {
  handleUnavailable.call(this, guild);
  return true;
}

function handleUnavailable(guild) {
  if (guild.unavailable) {
    addUnavailable.call(this, guild.id)
  } else {
    removeUnavailable.call(this, guild.id);
  }
}

function addUnavailable(id) {
  if (this._set.has(id)) return;
  this._set.add(id);

  this.push(id);
}
function removeUnavailable(id) {
  if (!this._set.has(id)) return;
  this._set.delete(id);

  var idx = this.indexOf(id);
  this.splice(idx, 1);
}
function clearCollections() {
  this._streamingGuilds.clear();
  this._set.clear();
  this.length = 0;
}

class UnavailableGuildCollection extends BaseArrayCollection {
  static _constructor(discordie, gateway) {
    if (typeof gateway !== "function")
      throw new Error("Gateway parameter must be a function");

    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      if (e.socket != gateway()) return;

      Utils.bindGatewayEventHandlers(this, e, {
        READY: handleConnectionOpen,
        GUILD_CREATE: handleGuildCreate,
        GUILD_DELETE: handleGuildDelete,
      });
    });

    this._discordie = discordie;
    this._set = new Set();

    this._streamingGuilds = new Set();
    this._streamingGuildsTimeout = null;

    Utils.privatify(this);
  }
  isGuildAvailable(guild) {
    // unavailable guilds that became available have key `unavailable`
    return guild.unavailable === false;
  }
}

module.exports = UnavailableGuildCollection;

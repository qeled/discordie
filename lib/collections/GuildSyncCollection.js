"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const Utils = require("../core/Utils");

const GUILD_SYNC_TIMEOUT = 3000;

function emitTaskFinished(gw) {
  this._syncingGuilds.clear();

  this._discordie.Dispatcher.emit(Events.READY_TASK_FINISHED, {
    socket: gw,
    name: this.constructor.name,
    handler: this
  });
}

function scheduleReadyTimeout(gw) {
  this._syncingGuildsTimeout = setTimeout(() => {
    this._syncingGuildsTimeout = null;
    if (!this._discordie.connected) return;

    setImmediate(() => emitTaskFinished.call(this, gw));
  }, GUILD_SYNC_TIMEOUT);
}

function maybeReady(gw) {
  if (this._syncingGuildsTimeout) {
    clearTimeout(this._syncingGuildsTimeout);
  }
  if (this._syncingGuilds.size) {
    scheduleReadyTimeout.call(this, gw);
  } else {
    setImmediate(() => emitTaskFinished.call(this, gw));
  }
}

function handleExecuteReadyTask(data, e) {
  clearAll.call(this);

  if (this.isSupported(e.socket)) {
    data.guilds.forEach(guild => {
      this.add(guild.id);
      this._syncingGuilds.add(guild.id);
    });
    commit.call(this);
  }

  maybeReady.call(this, e.socket);
  return true;
}

function handleGuildCreate(guild, e) {
  if (!this.isSupported(e.socket)) return true;

  // ignore if became available
  if (this._discordie.UnavailableGuilds.isGuildAvailable(guild)) return true;

  this.sync(guild);
  return true;
}

function handleGuildSync(guild, e) {
  if (this._syncingGuilds.has(guild.id)) {
    this._syncingGuilds.delete(guild.id);

    maybeReady.call(this, e.socket);
  }
  return true;
}

function handleGuildDelete(guild, e) {
  if (!this.isSupported(e.socket)) return true;
  if (guild.unavailable) return true;
  this.unsync(guild);
  return true;
}

function commit() {
  const gateway = this._gateway();
  if (!gateway || !gateway.connected) return;
  gateway.syncGuilds(Array.from(this));
}

function clearAll() {
  this.clear();
  this._syncingGuilds.clear();
}

class GuildSyncCollection extends Set {
  constructor(discordie, gateway) {
    super();

    if (typeof gateway !== "function")
      throw new Error("Gateway parameter must be a function");

    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      if (e.socket != gateway()) return;

      Utils.bindGatewayEventHandlers(this, e, {
        GUILD_SYNC: handleGuildSync,
        GUILD_CREATE: handleGuildCreate,
        GUILD_DELETE: handleGuildDelete,
      });
    });

    this._discordie = discordie;
    this._gateway = gateway;

    this._syncingGuilds = new Set();
    this._syncingGuildsTimeout = null;

    Utils.privatify(this);
  }
  _executeReadyTask(data, socket) {
    handleExecuteReadyTask.call(this, data, {socket});
  }
  isSupported(socket) {
    if (!socket) socket = this._gateway();
    if (!socket) return false;
    return socket.remoteGatewayVersion >= 5 && !this._discordie._user.bot;
  }
  sync(guild) {
    if (!this.isSupported()) return false;
    if (!guild) return false;

    if (Array.isArray(guild)) {
      const guilds = guild
        .map(g => g.id || g.valueOf())
        .filter(id => !this.has(id));
      if (!guilds.length) return false;
      guilds.forEach(id => this.add(id));
    } else {
      if (this.has(guild.id)) return false;
      this.add(guild.id);
    }

    commit.call(this);
    return true;
  }
  unsync(guild) {
    if (!this.isSupported()) return false;
    if (!guild) return false;

    if (Array.isArray(guild)) {
      const guilds = guild
        .map(g => g.id || g.valueOf())
        .filter(id => this.has(id));
      if (!guilds.length) return false;
      guilds.forEach(id => this.delete(id));
    } else {
      if (!this.delete(guild.id)) return false;
    }

    commit.call(this);
    return true;
  }
  syncAll() {
    const available = this._discordie.Guilds.map(g => g.valueOf());
    const unavailable = this._discordie.UnavailableGuilds;
    const all = available.concat(unavailable);
    return this.sync(all);
  }
  unsyncAll() {
    if (!this.isSupported()) return false;
    if (!this.size) return false;
    this.clear();
    commit.call(this);
    return true;
  }
}

module.exports = GuildSyncCollection;

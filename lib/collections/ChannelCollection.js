"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const ChannelTypes = Constants.ChannelTypes;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");

const Channel = require("../models/Channel");
const PermissionOverwrite = require("../models/PermissionOverwrite");
const IPermissions = require("../interfaces/IPermissions");

function convertOverwrites(channel) {
  const overwrites = channel.permission_overwrites || [];

  // note: @everyone overwrite does not exist by default
  // this will add one locally
  if (channel.guild_id) {
    const everyone = overwrites.find(o => o.id == channel.guild_id);
    if (!everyone) {
      overwrites.push({
        id: channel.guild_id,
        type: "role",
        allow: IPermissions.NONE,
        deny: IPermissions.NONE
      });
    }
  }

  return overwrites.map(o => new PermissionOverwrite(o));
}

function createChannel(channel) {
  return new Channel({
    id: channel.id,
    name: channel.name || "",
    topic: channel.topic || "",
    position: channel.position || 0,
    recipient_id: channel.is_private ? channel.recipient.id : null,
    type: channel.type || ChannelTypes.TEXT,
    guild_id: channel.guild_id,
    is_private: channel.is_private,
    permission_overwrites: convertOverwrites(channel),
    bitrate: channel.bitrate || Constants.BITRATE_DEFAULT
  });
}

function handleConnectionOpen(data) {
  this.clear();
  data.guilds.forEach(guild => handleGuildCreate.call(this, guild));
  data.private_channels.forEach(channel => {
    this.set(channel.id, createChannel(channel));
  });
  return true;
}

function handleCreateOrUpdateChannel(channel) {
  this.mergeOrSet(channel.id, createChannel(channel));
  return true;
}

function handleChannelDelete(channel) {
  this.delete(channel.id);
  return true;
}

function handleGuildCreate(guild) {
  if (!guild || guild.unavailable) return true;

  guild.channels.forEach(channel => {
    channel.guild_id = guild.id;
    this.set(channel.id, createChannel(channel));
  });
  return true;
}

function handleGuildDelete(guild) {
  this.forEach((channel, id) => {
    if (channel.guild_id == guild.id)
      this.delete(id);
  });
  return true;
}

class ChannelCollection extends BaseCollection {
  constructor(discordie, gateway) {
    super();

    if (typeof gateway !== "function")
      throw new Error("Gateway parameter must be a function");

    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      if (e.socket != gateway()) return;

      Utils.bindGatewayEventHandlers(this, e, {
        READY: handleConnectionOpen,
        GUILD_CREATE: handleGuildCreate,
        GUILD_DELETE: handleGuildDelete,
        CHANNEL_CREATE: handleCreateOrUpdateChannel,
        CHANNEL_UPDATE: handleCreateOrUpdateChannel,
        CHANNEL_DELETE: handleChannelDelete
      });
    });

    this._discordie = discordie;
    Utils.privatify(this);
  }
  *getPrivateChannelIterator() {
    for (let channel of this.values()) {
      if (channel.is_private)
        yield channel;
    }
  }
  *getGuildChannelIterator() {
    for (let channel of this.values()) {
      if (!channel.is_private)
        yield channel;
    }
  }
  getPrivateChannel(channelId) {
    var channel = this.get(channelId);
    if (!channel) return null;
    return channel.is_private ? channel : null;
  }
  getGuildChannel(channelId) {
    var channel = this.get(channelId);
    if (!channel) return null;
    return !channel.is_private ? channel : null;
  }
  isPrivate(channelId) {
    const channel = this.get(channelId);
    if (channel) return channel.is_private;
    return null;
  }
  getChannelType(channelId) {
    const channel = this.get(channelId);
    if (channel) return channel.type;
    return null;
  }
  update(channel) {
    handleCreateOrUpdateChannel.call(this, channel);
  }
  updatePermissionOverwrite(channelId, overwrite) {
    const channel = this.get(channelId);
    if (!channel) return;
    const newOverwrites = channel.permission_overwrites
      .filter(o => o.id != overwrite.id && o.type != overwrite.type);
    newOverwrites.push(new PermissionOverwrite(overwrite));
    this.set(channelId, channel.merge({
      permission_overwrites: newOverwrites
    }));
  }
}

module.exports = ChannelCollection;

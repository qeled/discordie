"use strict";

const ICollectionBase = require("./ICollectionBase");
const IChannel = require("./IChannel");
const ITextChannel = require("./ITextChannel");
const IVoiceChannel = require("./IVoiceChannel");
const IGuild = require("./IGuild");
const Utils = require("../core/Utils");
const Constants = require("../Constants");
const ChannelTypes = Constants.ChannelTypes;

class IChannelCollection extends ICollectionBase {
  constructor(discordie, valuesGetter) {
    super({
      valuesGetter: valuesGetter,
      itemFactory: (id) => {
        const type = this._discordie._channels.getChannelType(id);
        if (!type || type == ChannelTypes.TEXT) {
          return new ITextChannel(this._discordie, id);
        }
        return new IVoiceChannel(this._discordie, id);
      }
    });
    this._discordie = discordie;
    Utils.privatify(this);
  }
  forGuild(guildId) {
    guildId = guildId.valueOf();

    return this.filter((channel) => channel.guild_id == guildId);
    //return new IChannelCollection(this._discordie,
    //  this._conditionalIterator((channel) => channel.guild_id == guildId)
    //);
  }
  textForGuild(guildId) {
    guildId = guildId.valueOf();

    return this.filter((channel) =>
      channel.guild_id == guildId && channel.type == ChannelTypes.TEXT);
    //return new IChannelCollection(this._discordie,
    //  this._conditionalIterator((channel) =>
    //    channel.guild_id == guildId &&
    //      channel.type == ChannelTypes.TEXT)
    //);
  }
  voiceForGuild(guildId) {
    guildId = guildId.valueOf();

    return this.filter((channel) =>
      channel.guild_id == guildId && channel.type == ChannelTypes.VOICE);
    //return new IChannelCollection(this._discordie,
    //  this._conditionalIterator((channel) =>
    //    channel.guild_id == guildId &&
    //      channel.type == ChannelTypes.VOICE)
    //);
  }
}

module.exports = IChannelCollection;

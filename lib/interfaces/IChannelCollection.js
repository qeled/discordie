"use strict";

const ICollectionBase = require("./ICollectionBase");
const IChannel = require("./IChannel");
const ITextChannel = require("./ITextChannel");
const IVoiceChannel = require("./IVoiceChannel");
const ICategoryChannel = require("./ICategoryChannel");
const IGuild = require("./IGuild");
const Utils = require("../core/Utils");
const Constants = require("../Constants");
const ChannelTypes = Constants.ChannelTypes;

/**
 * @interface
 * @extends ICollectionBase
 */
class IChannelCollection extends ICollectionBase {
  constructor(discordie, valuesGetter, valueGetter) {
    super({
      valuesGetter: valuesGetter,
      valueGetter: valueGetter,
      itemFactory: (id) => {
        const type = this._discordie._channels.getChannelType(id);
        if (type === ChannelTypes.GUILD_VOICE) {
          return new IVoiceChannel(this._discordie, id);
        } else if (type === ChannelTypes.GUILD_CATEGORY) {
          return new ICategoryChannel(this._discordie, id);
        }
        return new ITextChannel(this._discordie, id);
      }
    });
    Utils.definePrivate(this, {_discordie: discordie});
  }

  /**
   * Creates an array of `IChannel` (`ITextChannel` and `IVoiceChannel`)
   * for `guild`.
   * @param {IGuild|String} guild
   * @returns {Array<IChannel>}
   */
  forGuild(guild) {
    return this.filter(channel => channel.guild_id == guild);
  }

  /**
   * Creates an array of `ITextChannel` for `guild`.
   * @param {IGuild|String} guild
   * @returns {Array<ITextChannel>}
   */
  textForGuild(guild) {
    return this.filter(channel =>
      channel.guild_id == guild && channel.type == ChannelTypes.GUILD_TEXT
    );
  }

  /**
   * Creates an array of `IVoiceChannel` for `guild`.
   * @param {IGuild|String} guild
   * @returns {Array<IVoiceChannel>}
   */
  voiceForGuild(guild) {
    return this.filter(channel =>
      channel.guild_id == guild && channel.type == ChannelTypes.GUILD_VOICE
    );
  }

  /**
   * Creates an array of `ICategoryChannel` for `guild`.
   * @param {IGuild|String} guild
   * @returns {Array<ICategoryChannel>}
   */
  categoriesForGuild(guild) {
    return this.filter(channel =>
      channel.guild_id == guild && channel.type == ChannelTypes.GUILD_CATEGORY
    );
  }

  /**
   * Creates an array of `IChannel` for `category`.
   * @param {IGuild|String} guild
   * @returns {Array<IChannel>}
   */
  childrenForCategory(category) {
    if (!category) return [];
    return this.filter(channel =>
      channel.guild_id == category.guild_id && channel.parent_id == category.id
    );
  }
}

module.exports = IChannelCollection;

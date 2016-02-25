"use strict";

const ICollectionBase = require("./ICollectionBase");
const IMessage = require("./IMessage");
const IChannel = require("./IChannel");
const Utils = require("../core/Utils");

/**
 * @interface
 * @extends ICollectionBase
 */
class IMessageCollection extends ICollectionBase {
  constructor(discordie, valuesGetter, valueGetter) {
    super({
      valuesGetter: valuesGetter,
      valueGetter: valueGetter,
      itemFactory: (id) => new IMessage(this._discordie, id)
    });
    this._discordie = discordie;
    Utils.privatify(this);
  }

  /**
   * Creates an array of `IMessage` for `channel`, sorted in order of arrival.
   * Fetching messages using non-WS API will result in channel cache sorting.
   * @param {IChannel|String} channel
   * @returns {Array<IMessage>}
   */
  forChannel(channel) {
    var cache = this._discordie._messages.getChannelCache(channel.valueOf());
    if (!cache || !cache.size) return [];
    return cache.map(message => this._getOrCreateInterface(message));
  }

  /**
   * Purges channel cache.
   * @param {IChannel|String} channel
   */
  purgeChannelCache(channel) {
    channel = channel.valueOf();
    return this._discordie._messages.purgeChannelCache(channel);
  }

  /**
   * Purges edits cache globally.
   */
  purgeEdits() {
    return this._discordie._messages.purgeEdits();
  }

  /**
   * Purges message cache globally.
   */
  purgeAllCache() {
    return this._discordie._messages.purgeAllCache();
  }

  /**
   * Gets channel message cache limit.
   * @param {IChannel|String} channel
   * @returns {Number}
   */
  getChannelMessageLimit(channel) {
    channel = channel.valueOf();
    return this._discordie._messages.getChannelMessageLimit(channel);
  }

  /**
   * Sets channel message cache limit (with a minimum of 1).
   * Limit reverts to default when channel (or cache) is destroyed.
   * Returns false if limit is invalid or channel does not exist.
   * @param {IChannel|String} channel
   * @param {Number} limit
   * @returns {Boolean}
   */
  setChannelMessageLimit(channel, limit) {
    channel = channel.valueOf();
    return this._discordie._messages.setChannelMessageLimit(channel, limit);
  }

  /**
   * Gets global message cache limit per channel.
   * @returns {Number}
   */
  getMessageLimit() {
    return this._discordie._messages.getMessageLimit();
  }

  /**
   * Sets global message cache limit per channel (with a minimum of 1).
   * Does not affect channels with custom limits if new is lower than current.
   * @param {Number} limit
   */
  setMessageLimit(limit) {
    return this._discordie._messages.setMessageLimit(limit);
  }

  /**
   * Gets global edits cache limit per message.
   * @returns {Number}
   */
  getEditsLimit() {
    return this._discordie._messages.getEditsLimit();
  }

  /**
   * Sets global edits cache limit per message.
   * @param {Number} limit
   */
  setEditsLimit(limit) {
    return this._discordie._messages.setEditsLimit(limit);
  }
}

module.exports = IMessageCollection;

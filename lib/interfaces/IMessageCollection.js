"use strict";

const ICollectionBase = require("./ICollectionBase");
const IMessage = require("./IMessage");
const IChannel = require("./IChannel");
const Utils = require("../core/Utils");

const rest = require("../networking/rest");

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
   * Creates an array of cached messages in `channel`, sorted in order of
   * arrival.
   *
   * Returns an empty array if channel does not exist.
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

  /**
   * Makes a request to edit a message.
   * Alternative method for editing messages that are not in cache.
   *
   * Editing of other users' messages is not allowed, server will send an
   * `Error` `Forbidden` and returned promise will be rejected if you attempt
   * to do so.
   *
   * Parameter `messageId` can be an object with fields `{channel_id, id}`,
   * where `id` is a String message id, `channel_id` is a String channel id.
   *
   * Parameter `channelId` is ignored when `messageId` is an object or
   * an instance of `IMessage`.
   *
   * Returns a promise that resolves to a JSON object of the edited message.
   *
   * @param {String} content
   * @param {IMessage|Object|String} messageId
   * @param {String} channelId - Ignored if `messageId` is an object with `id`
   * @returns {Promise<Object, Error>}
   * @example
   * var message = client.Messages.find(m => true); // get any message
   * client.Messages.editMessage("new content", message);
   *
   * var jsonMessage = {id: message.id, channel_id: message.channel_id};
   * client.Messages.editMessage("new content", jsonMessage);
   *
   * client.Messages.editMessage("new content", message.id, message.channel_id);
   */
  editMessage(content, messageId, channelId) {
    var message = {id: messageId, channel_id: channelId};

    if (messageId && messageId.id) {
      message.id = messageId.id;
      message.channel_id = messageId.channel_id || messageId.channelId;
    }

    return rest(this._discordie)
      .channels.patchMessage(message.channel_id, message.id, content);
  }

  /**
   * Makes a request to delete a message.
   * Alternative method for deleting messages that are not in cache.
   *
   * Parameter `messageId` can be an object with fields `{channel_id, id}`,
   * where `id` is a String message id, `channel_id` is a String channel id.
   *
   * Parameter `channelId` is ignored when `messageId` is an object or
   * an instance of `IMessage`.
   *
   * @param {IMessage|Object|String} messageId
   * @param {String} channelId - Ignored if `messageId` is an object with `id`
   * @returns {Promise}
   * @example
   * var message = client.Messages.find(m => true); // get any message
   * client.Messages.deleteMessage(message);
   *
   * var jsonMessage = {id: message.id, channel_id: message.channel_id};
   * client.Messages.deleteMessage(jsonMessage);
   *
   * client.Messages.deleteMessage(message.id, message.channel_id);
   */
  deleteMessage(messageId, channelId) {
    var message = {id: messageId, channel_id: channelId};

    if (messageId && messageId.id) {
      message.id = messageId.id;
      message.channel_id = messageId.channel_id || messageId.channelId;
    }

    return rest(this._discordie)
      .channels.deleteMessage(message.channel_id, message.id);
  }
}

module.exports = IMessageCollection;

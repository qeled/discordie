"use strict";

const ICollectionBase = require("./ICollectionBase");
const IMessage = require("./IMessage");
const IChannel = require("./IChannel");
const Utils = require("../core/Utils");

const rest = require("../networking/rest");

/**
 * @interface
 * @extends ICollectionBase
 * @description
 * Collection with all cached messages.
 *
 * **Includes deleted messages** - you can filter them by checking
 * `IMessage.deleted` boolean.
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
   * arrival (message cache is sorted on message insertion, not when this
   * getter is invoked).
   *
   * Returns an empty array if channel no longer exists.
   *
   * > **Note:** Message cache also includes deleted messages.
   * >           You can filter them by checking `IMessage.deleted` boolean.
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
   * Creates an array of cached pinned messages in `channel`.
   *
   * Pinned message cache is updated only if all pinned messages have been
   * loaded with `ITextChannel.fetchPinned()`.
   *
   * Returns an empty array if channel no longer exists or if pinned messages
   * have not been fetched yet.
   * @param {IChannel|String} channel
   * @returns {Array<IMessage>}
   */
  forChannelPinned(channel) {
    var cache = this._discordie._messages.getChannelPinned(channel.valueOf());
    if (!cache) return [];
    return cache.map(msg => this._getOrCreateInterface(msg));
  }

  /**
   * Purges pinned message cache for `channel`.
   * @param {IChannel|String} channel
   */
  purgeChannelPinned(channel) {
    channel = channel.valueOf();
    return this._discordie._messages.purgeChannelPinned(channel);
  }

  /**
   * Purges pinned message cache globally.
   */
  purgePinned() {
    return this._discordie._messages.purgePinned();
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
   * @param {String|Object} [content]
   * @param {IMessage|Object|String} messageId
   * @param {String} channelId - Ignored if `messageId` is an object with `id`
   * @param {Object} [embed]
   * Refer to [official API documentation](https://discordapp.com/developers/docs/resources/channel#embed-object)
   * for embed structure description.
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
  editMessage(content, messageId, channelId, embed) {
    if (Array.isArray(content)) content = content.join("\n");
    if (content && typeof content !== "string") content = String(content);

    var message = {id: messageId, channel_id: channelId};

    if (messageId && messageId.id) {
      message.id = messageId.id;
      message.channel_id = messageId.channel_id || messageId.channelId;
    }

    return rest(this._discordie)
      .channels.patchMessage(message.channel_id, message.id, content, embed);
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

  /**
   * Makes a request to pin a message.
   * Alternative method for pinning messages that are not in cache.
   *
   * Accepts same parameters as `IMessageCollection.deleteMessage`.
   *
   * @param {IMessage|Object|String} messageId
   * @param {String} channelId - Ignored if `messageId` is an object with `id`
   * @returns {Promise}
   */
  pinMessage(messageId, channelId) {
    var message = {id: messageId, channel_id: channelId};

    if (messageId && messageId.id) {
      message.id = messageId.id;
      message.channel_id = messageId.channel_id || messageId.channelId;
    }

    return rest(this._discordie)
      .channels.pinMessage(message.channel_id, message.id);
  }

  /**
   * Makes a request to unpin a message.
   * Alternative method for unpinning messages that are not in cache.
   *
   * Accepts same parameters as `IMessageCollection.deleteMessage`.
   *
   * @param {IMessage|Object|String} messageId
   * @param {String} channelId - Ignored if `messageId` is an object with `id`
   * @returns {Promise}
   */
  unpinMessage(messageId, channelId) {
    var message = {id: messageId, channel_id: channelId};

    if (messageId && messageId.id) {
      message.id = messageId.id;
      message.channel_id = messageId.channel_id || messageId.channelId;
    }

    return rest(this._discordie)
      .channels.unpinMessage(message.channel_id, message.id);
  }

  /**
   * Makes a request to delete multiple messages.
   *
   * If `messages` array contains instances of `IMessage`, parameter `channel`
   * is not required as it will be determined from the first message instance.
   * Also deleted messages will be omitted from the request.
   *
   * If `messages` array is empty, returned promise resolves instantly
   * without sending a request.
   * @param {Array<IMessage|String>} messages
   * @param {IChannel|String} [channel]
   * Channel or channel id, required is `messages` is an array of string ids
   * @returns {Promise}
   */
  deleteMessages(messages, channel) {
    if (!Array.isArray(messages))
      throw new TypeError("Param 'messages' must be an array");

    messages = messages.filter(m => {
      if (m instanceof IMessage)
        return !m.deleted;
      return true;
    });

    if (!messages.length) return Promise.resolve();

    var internalMessage = messages.find(v => v.channel_id);
    if (!internalMessage && !channel)
      throw new TypeError("Param 'channel' must be defined for arrays of ids");

    channel = (internalMessage && !channel) ?
      internalMessage.channel_id :
      channel.valueOf();

    // bulk-delete returns 'Bad Request' in this case
    if (messages.length === 1) {
      return rest(this._discordie)
        .channels.deleteMessage(channel, messages[0].valueOf());
    }

    return rest(this._discordie)
      .channels.deleteMessages(channel, messages.map(v => v.valueOf()));
  }

  /**
   * Resolves user and channel references to proper names.
   * References that are not found in cache will be left as is and not resolved.
   * @param {String} content
   * @param {IGuild|String} [guild]
   * Optional guild to resolve roles and nicknames from
   * @returns {String}
   * @example
   * var content = message.content;
   * // 'just a message for <@157838423632817262> in <#78826383786329613>'
   * var resolvedContent = message.resolveContent();
   * // 'just a message for @testie in #general'
   * var resolvedContent = client.Messages.resolveContent(message.content);
   * // 'just a message for @testie in #general'
   */
  resolveContent(content, guild) {
    if (typeof content !== "string")
      throw new TypeError("Param 'content' is not a string");
    if (guild) {
      var guildId = guild.valueOf();
      guild = this._discordie.Guilds.get(guildId);
    }
    return content.replace(/<(@!?|#|@&)([0-9]+)>/g, (match, type, id) => {
      if (type === "@" || type === "@!") { // user
        var user = this._discordie.Users.get(id);
        if (!user) return match;
        if (guild && type === "@!") {
          var member = user.memberOf(guild);
          return (member && ("@" + member.name)) || match;
        }
        return (user && ("@" + user.username)) || match;
      }
      else if (type === "#") { // channel
        var channel = this._discordie.Channels.get(id);
        return (channel && ("#" + channel.name)) || match;
      }
      else if (type === "@&") { // role
        if (!guild || !guild.roles) return match;
        var role = guild.roles.find(r => r.id === id);
        return (role && ("@" + role.name)) || match;
      }
    });
  }
}

module.exports = IMessageCollection;

"use strict";

const Constants = require("../Constants");
const MessageTypes = Constants.MessageTypes;

const IBase = require("./IBase");
const IRole = require("./IRole");
const Utils = require("../core/Utils");
const Message = require("../models/Message");

const rest = require("../networking/rest");

/**
 * @interface
 * @model Message
 * @extends IBase
 * @description
 * Chat message. Can be a system message depending on type:
 *
 * ```js
 * Discordie.MessageTypes: {
 *   DEFAULT: 0,
 *   RECIPIENT_ADD: 1,
 *   RECIPIENT_REMOVE: 2,
 *   CALL: 3,
 *   CHANNEL_NAME_CHANGE: 4,
 *   CHANNEL_ICON_CHANGE: 5
 * }
 * ```
 */
class IMessage extends IBase {
  constructor(discordie, messageId) {
    super();
    Utils.definePrivate(this, {
      _discordie: discordie,
      _messageId: messageId
    });

    Object.freeze(this);
  }

  /**
   * Checks whether this message is cached.
   * @param {IMessage} message
   * @returns {boolean}
   * @readonly
   */
  get isCached() {
    return !!this._valid;
  }

  /**
   * Checks whether this message was edited by the author.
   *
   * Returns null if message does not exist in cache.
   * @returns {boolean|null}
   * @readonly
   */
  get isEdited() {
    return this.isCached ? this.edited_timestamp != null : null;
  }

  /**
   * Checks whether this message is from a private channel (direct message).
   *
   * Returns null if message/channel does not exist in cache.
   * @returns {boolean|null}
   * @readonly
   */
  get isPrivate() {
    return this._discordie._channels.isPrivate(this.channel_id);
  }

  /**
   * Checks whether the message is a system message.
   * @returns {boolean|null}
   * @readonly
   */
  get isSystem() {
    return this.type !== MessageTypes.DEFAULT;
  }

  /**
   * Generates a system message string depending on message `type`.
   * @returns {String|null}
   * @readonly
   */
  get systemMessage() {
    if (!this._valid) return null;

    const type = this.type;

    const user = this.author || {};
    const target = this.mentions[0] || {};

    if (type === MessageTypes.RECIPIENT_ADD) {
      return user.username + " added " + target.username + " to the group.";
    }

    if (type === MessageTypes.RECIPIENT_REMOVE) {
      if (user.id !== target.id) {
        return user.username + " added " + target.username + " to the group.";
      } else {
        return user.username + " left the group.";
      }
    }

    if (type === MessageTypes.CALL) {
      const localUserId = this._discordie._user && this._discordie._user.id;
      const isActive =
        this._discordie._calls.isActive(this.channel_id, this.id);
      const isMissed =
        !isActive &&
        this.call && this.call.participants &&
        this.call.participants.indexOf(localUserId) < 0;

      if (isMissed) {
        return "You missed a call from " + user.username + ".";
      }

      if (isActive) {
        return user.username + " started a call. Join the call.";
      } else {
        return user.username + " started a call.";
      }
    }

    if (type === MessageTypes.CHANNEL_NAME_CHANGE) {
      return user.username + " changed the channel name: " + this.content;
    }

    if (type === MessageTypes.CHANNEL_ICON_CHANGE) {
      return user.username + " changed the channel icon.";
    }
  }

  /**
   * Gets channel of this message.
   *
   * Returns null if message does not exist in cache.
   * @returns {ITextChannel|IDirectMessageChannel|null}
   * @readonly
   */
  get channel() {
    if (this.isPrivate) {
      return this._discordie.DirectMessageChannels.get(this.channel_id);
    }
    return this._discordie.Channels.get(this.channel_id);
  }

  /**
   * Gets guild of this message.
   *
   * Returns null if message does not exist in cache or from a private
   * channel (direct message).
   * @returns {IGuild|null}
   * @readonly
   */
  get guild() {
    if (this.isPrivate || !this.isCached) return null;
    return this.channel ? this.channel.guild : null;
  }

  /**
   * Gets member instance of author.
   *
   * Returns null for private channels or if message does not exist in cache.
   * @returns {IGuildMember|null}
   * @readonly
   */
  get member() {
    if (this.isPrivate || !this.isCached) return null;
    return this._discordie.Users.getMember(this.guild.id, this.author.id);
  }

  /**
   * Creates an array of all known (cached) versions of this message (including
   * the latest).
   * Sorted from latest (first) to oldest (last).
   * Does not include embeds.
   * @returns {Array<Object>}
   * @readonly
   */
  get edits() {
    return this._discordie._messages.getEdits(this.id);
  }

  /**
   * Resolves user and channel references in `content` property to proper names.
   * References that are not found in cache will be left as is and not resolved.
   *
   * Returns null if this message is not cached.
   * @returns {String|null}
   * @example
   * var content = message.content;
   * // 'just a message for <@157838423632817262> in <#78826383786329613>'
   * var resolvedContent = message.resolveContent();
   * // 'just a message for @testie in #general'
   * var resolvedContent = client.Messages.resolveContent(message.content);
   * // 'just a message for @testie in #general'
   */
  resolveContent() {
    if (!this.isCached) return null;
    return this._discordie.Messages.resolveContent(this.content, this.guild);
  }

  /**
   * Makes a request to edit this message.
   *
   * Editing of other users' messages is not allowed, server will send an
   * `Error` `Forbidden` and returned promise will be rejected if you attempt
   * to do so.
   *
   * See `IMessageCollection.editMessage` if you are looking for a method
   * that can operate on JSON or raw message id.
   * @param {String} content
   * @returns {Promise<IMessage, Error>}
   */
  edit(content) {
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .channels.patchMessage(this.channel_id, this.id, content)
      .then(() => rs(this))
      .catch(rj);
    });
  }

  /**
   * Makes a request to delete this message.
   *
   * See `IMessageCollection.deleteMessage` if you are looking for a method
   * that can operate on JSON or raw message id.
   * @returns {Promise}
   */
  delete() {
    return rest(this._discordie)
      .channels.deleteMessage(this.channel_id, this.id);
  }

  /**
   * Makes a request to pin this message.
   *
   * See `IMessageCollection.pinMessage` if you are looking for a method
   * that can operate on JSON or raw message id.
   * @returns {Promise<IMessage, Error>}
   */
  pin() {
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .channels.pinMessage(this.channel_id, this.id)
        .then(() => rs(this))
        .catch(rj);
    });
  }

  /**
   * Makes a request to unpin this message.
   *
   * See `IMessageCollection.unpinMessage` if you are looking for a method
   * that can operate on JSON or raw message id.
   * @returns {Promise<IMessage, Error>}
   */
  unpin() {
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .channels.unpinMessage(this.channel_id, this.id)
        .then(() => rs(this))
        .catch(rj);
    });
  }

  /**
   * Makes a request to send a reply to channel the message was from, prefixing
   * content with author's mention in non-private channels.
   * @param {String} content
   * @param {IUser|IGuildMember|Array<IUser>|Array<IGuildMember>} [mentions]
   * @param {boolean} [tts]
   * @returns {Promise<IMessage, Error>}
   */
  reply(content, mentions, tts) {
    if (this.isPrivate) {
      return this.channel.sendMessage(content, mentions, tts);
    }
    return this.channel
      .sendMessage(`${this.author.mention}, ${content}`, mentions, tts);
  }
}

IMessage._inherit(Message, function modelPropertyGetter(key) {
  return this._discordie._messages.get(this._messageId)[key];
});
IMessage._setSuppressErrors(true);

/**
 * @readonly
 * @instance
 * @memberOf IMessage
 * @name author
 * @returns {IUser}
 */
IMessage._setValueOverride("author", function(v) {
  return v ? this._discordie.Users.get(v.id) : null;
});

/**
 * @readonly
 * @instance
 * @memberOf IMessage
 * @name mentions
 * @returns {Array<IUser>}
 */
IMessage._setValueOverride("mentions", function(v) {
  return v ? v.map(u => this._discordie.Users.get(u.id)) : [];
});

/**
 * @readonly
 * @instance
 * @memberOf IMessage
 * @name mention_roles
 * @returns {Array<IRole>}
 */
IMessage._setValueOverride("mention_roles", function(rolesRaw) {
  if (!rolesRaw || !this.guild) return [];
  var guildId = this.guild.id;
  return rolesRaw.map(id => new IRole(this._discordie, id, guildId));
});


module.exports = IMessage;

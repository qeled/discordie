"use strict";

const IBase = require("./IBase");
const Utils = require("../core/Utils");
const Message = require("../models/Message");

const rest = require("../networking/rest");

/**
 * @interface
 * @model Message
 * @extends IBase
 */
class IMessage extends IBase {
  constructor(discordie, messageId) {
    super(Message, (key) =>
      this._discordie._messages.get(this._messageId)[key]
    );
    this._discordie = discordie;
    this._messageId = messageId;
    this._suppressErrors = true;
    Utils.privatify(this);

    /**
     * @readonly
     * @instance
     * @memberOf IMessage
     * @name author
     * @returns {IUser}
     */
    this._setValueOverride("author", v =>
      v ? this._discordie.Users.get(v.id) : null
    );

    /**
     * @readonly
     * @instance
     * @memberOf IMessage
     * @name mentions
     * @returns {Array<IUser>}
     */
    this._setValueOverride("mentions", v =>
      v ? v.map(u => this._discordie.Users.get(u.id)) : []
    );

    Object.freeze(this);
  }

  /**
   * Checks whether this message is cached.
   * @param {IMessage} message
   * @returns {boolean}
   * @readonly
   */
  get isCached() {
    return this.author != null;
  }

  /**
   * Checks whether this message was edited by the author.
   * Returns null if message does not exist in cache.
   * @returns {boolean|null}
   * @readonly
   */
  get isEdited() {
    return this.isCached ? this.edited_timestamp != null : null;
  }

  /**
   * Checks whether this message is from a private channel (direct message).
   * Returns null if message/channel does not exist in cache.
   * @returns {boolean|null}
   * @readonly
   */
  get isPrivate() {
    return this._discordie._channels.isPrivate(this.channel_id);
  }

  /**
   * Gets channel of this message.
   * Returns null if message does not exist in cache.
   * @returns {IChannel|IDirectMessageChannel|null}
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
   * Makes a request to edit this message.
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
   * @returns {Promise}
   */
  delete() {
    return rest(this._discordie)
      .channels.deleteMessage(this.channel_id, this.id);
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

module.exports = IMessage;

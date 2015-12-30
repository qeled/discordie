"use strict";

const IBase = require("./IBase");
const ITextChannel = require("./ITextChannel");
const Utils = require("../core/Utils");
const Channel = require("../models/Channel");

const rest = require("../networking/rest");

/**
 * @interface
 * @model Channel
 * @extends IBase
 */
class IDirectMessageChannel extends IBase {
  constructor(discordie, directMessageChannelId) {
    super(Channel, (key) =>
      this._discordie._channels.get(this._directMessageChannelId)[key]
    );
    this._discordie = discordie;
    this._directMessageChannelId = directMessageChannelId;
    Utils.privatify(this);

    /**
     * @readonly
     * @instance
     * @memberOf IDirectMessageChannel
     * @name name
     * @returns {String}
     */
    this._setValueOverride("name", v => this.recipient.username);

    Object.freeze(this);
  }

  /**
   * Gets recipient of this channel.
   * @returns {IUser|null}
   * @readonly
   */
  get recipient() {
    return this._discordie.Users.get(this.recipient_id);
  }
  /**
   * Gets a value indicating whether all messages were loaded.
   * @returns {boolean}
   * @readonly
   */
  get allMessagesLoaded() {
    return !this._discordie._messages.channelHasMore(this.id);
  }
  /**
   * Gets all messages in this channel.
   * @returns {Array<IMessage>}
   * @readonly
   */
  get messages() {
    return this._discordie.Messages.forChannel(this.id);
  }
  /**
   * Makes a request to fetch messages for this channel.
   * Successful call will result in internal message cache sorting.
   * @param {Number|null} limit
   * @param {String|null} before - Message id
   * @param {String|null} after - Message id
   * @returns {Promise<Array<IMessage>, Error>}
   */
  fetchMessages(limit, before, after) {
    return ITextChannel.prototype.fetchMessages.apply(this, arguments);
  }
  /**
   * Makes a request to send a message to this channel.
   * @param {String} content
   * @param {IUser|IGuildMember|Array<IUser>|Array<IGuildMember>} mentions
   * @param {boolean} tts
   * @returns {Promise<IMessage, Error>}
   */
  sendMessage(content, mentions, tts) {
    return ITextChannel.prototype.sendMessage.apply(this, arguments);
  }
  uploadFile(readStream, filename) {
    return ITextChannel.prototype.uploadFile.apply(this, arguments);
  }
  sendTyping() {
    return ITextChannel.prototype.sendTyping.apply(this, arguments);
  }
  close() {
    return rest(this._discordie).channels.deleteChannel(this.id);
  }
}

module.exports = IDirectMessageChannel;

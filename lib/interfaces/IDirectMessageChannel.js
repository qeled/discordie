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
    super();
    Utils.definePrivate(this, {
      _discordie: discordie,
      _directMessageChannelId: directMessageChannelId
    });

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
   * Creates an array of cached messages in this channel, sorted in order of
   * arrival (message cache is sorted on message insertion, not when this
   * getter is invoked).
   *
   * Returns an empty array if channel no longer exists.
   * @returns {Array<IMessage>}
   * @readonly
   */
  get messages() {
    return this._discordie.Messages.forChannel(this.id);
  }

  /**
   * Makes a request to fetch messages for this channel.
   *
   * Discord API does not allow fetching more than 100 messages at once.
   *
   * Promise resolves with an Object with following structure:
   * ```js
   * {
   *   messages: Array<IMessage>,
   *   limit: Number, // same as parameter passed or default value
   *   before: String | null, // message id
   *   after: String | null // message id
   * }
   * ```
   * @param {Number|null} [limit] - Default is 100
   * @param {IMessage|String|null} [before] - Message or message id
   * @param {IMessage|String|null} [after] - Message or message id
   * @returns {Promise<Object, Error>}
   * @example
   * var guild = client.Guilds.find(g => g.name == "test");
   * var channel = guild.generalChannel;
   *
   * // simple fetch:
   * channel.fetchMessages().then(() => {
   *   console.log("[simple] messages in cache: " + channel.messages.length);
   * });
   *
   * // fetching more than 100 messages into cache sequentially:
   * fetchMessagesEx(channel, 420).then(() => {
   *   console.log("[extended] messages in cache: " + channel.messages.length);
   * });
   *
   * // fetch more messages just like Discord client does
   * function fetchMessagesEx(channel, left) {
   *   // message cache is sorted on insertion
   *   // channel.messages[0] will get oldest message
   *   var before = channel.messages[0];
   *   return channel.fetchMessages(left, before)
   *          .then(e => onFetch(e, channel, left));
   * }
   * function onFetch(e, channel, left) {
   *   if (!e.messages.length) return Promise.resolve();
   *   left -= e.messages.length;
   *   console.log(`Received ${e.messages.length}, left: ${left}`);
   *   if (left <= 0) return Promise.resolve();
   *   return fetchMessagesEx(channel, left);
   * }
   */
  fetchMessages(limit, before, after) {
    return ITextChannel.prototype.fetchMessages.apply(this, arguments);
  }

  /**
   * Makes a request to send a message to this channel.
   * @param {String} content
   * @param {IUser|IGuildMember|Array<IUser>|Array<IGuildMember>} [mentions]
   * Deprecated: left for backward compatibility.
   * @param {boolean} [tts]
   * @returns {Promise<IMessage, Error>}
   * @example
   * var guild = client.Guilds.find(g => g.name == "test");
   * if (!guild) return console.log("invalid guild");
   *
   * var channel = guild.generalChannel;
   *
   * channel.sendMessage("regular message");
   * channel.sendMessage("test with tts", true);
   *
   * var user = client.Users.find(u => u.username == "test");
   * if (!user) return console.log("invalid user");
   *
   * channel.sendMessage("mentioning user " + user.mention);
   * channel.sendMessage("@everyone or @here mention if you have permissions");
   */
  sendMessage(content, mentions, tts) {
    return ITextChannel.prototype.sendMessage.apply(this, arguments);
  }

  /**
   * Makes a request to upload data to this channel.
   * Images require a `filename` with a valid extension to actually be uploaded.
   * @param {Buffer|ReadableStream|String} readableStream
   * Data to upload or filename as a string
   * @param {String} filename
   * Actual filename to show, required for non-string `readableStream`
   * @param {String} [content] - Additional comment message for attachment
   * @param {boolean} [tts]
   * @returns {Promise<IMessage, Error>}
   * @example
   * channel.uploadFile(fs.readFileSync("test.png"), "test.png"); // Buffer
   * channel.uploadFile(fs.createReadStream("test.png"), "test.png"); // Stream
   * channel.uploadFile("test.png"); // File
   * channel.uploadFile("test.png", null, "file with message");
   * channel.uploadFile("test.png", null, "file with message and tts", true);
   */
  uploadFile(readableStream, filename, content, mentions, tts) {
    return ITextChannel.prototype.uploadFile.apply(this, arguments);
  }

  /**
   * Makes a request to send typing status for this channel.
   *
   * Discord client displays it for 10 seconds, sends every 5 seconds.
   * Stops showing typing status if receives a message from the user.
   * @returns {Promise}
   */
  sendTyping() {
    return ITextChannel.prototype.sendTyping.apply(this, arguments);
  }

  /**
   * Makes a request to close this channel (direct message channels only).
   * @returns {Promise}
   */
  close() {
    return rest(this._discordie).channels.deleteChannel(this.id);
  }
}

IDirectMessageChannel._inherit(Channel, function modelPropertyGetter(key) {
  return this._discordie._channels.get(this._directMessageChannelId)[key];
});

/**
 * @readonly
 * @instance
 * @memberOf IDirectMessageChannel
 * @name name
 * @returns {String}
 */
IDirectMessageChannel._setValueOverride("name", function(v) {
  return this.recipient.username;
});

module.exports = IDirectMessageChannel;

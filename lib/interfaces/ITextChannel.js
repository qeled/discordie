"use strict";

const Utils = require("../core/Utils");
const User = require("../models/User");
const IChannel = require("./IChannel");
const IUser = require("./IUser");

const Constants = require("../Constants");
const Permissions = Constants.Permissions;

const rest = require("../networking/rest");

/**
 * @interface
 * @model Channel
 * @extends IChannel
 */
class ITextChannel extends IChannel {
  constructor(discordie, channelId) {
    super(discordie, channelId);
  }

  /**
   * Creates a mention from this channel's id.
   * @returns {String}
   * @readonly
   * @example
   * channel.sendMessage(channel.mention + ", example mention");
   */
  get mention() {
    return `<#${this.id}>`;
  }

  /**
   * Creates an array of IGuildMember that
   * have permissions to read this channel.
   * @returns {Array<IGuildMember>}
   * @readonly
   */
  get members() {
    return this._discordie.Users.membersForChannel(this);
  }

  /**
   * Gets a value indicating whether it is a default (general) channel.
   * @returns {boolean}
   * @readonly
   */
  get isDefaultChannel() {
    return this.guild_id === this.id;
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
   *
   * > **Note:** Message cache also includes deleted messages.
   * >           You can filter them by checking `IMessage.deleted` boolean.
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
   *   return channel.fetchMessages(Math.min(left, 100), before)
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
    if (!limit) limit = 100;
    if (before) before = before.valueOf();
    if (after) after = after.valueOf();
    return new Promise((rs, rj) => {
      rest(this._discordie).channels.getMessages(this.id, limit, before, after)
      .then(e => {
        e.messages = e.messages
          .map(msg => this._discordie.Messages.get(msg.id));
        return rs(e);
      })
      .catch(rj);
    });
  }

  /**
   * Creates an array of cached pinned messages in this channel.
   *
   * Pinned message cache is updated only if all pinned messages have been
   * loaded with `ITextChannel.fetchPinned()`.
   *
   * Returns an empty array if channel no longer exists or if pinned messages
   * have not been fetched yet.
   * @returns {Array<IMessage>}
   * @readonly
   */
  get pinnedMessages() {
    return this._discordie.Messages.forChannelPinned(this.id);
  }

  /**
   * Makes a request to fetch pinned messages for this channel.
   *
   * Promise resolves with an Object with following structure:
   * ```js
   * {
   *   channelId: String,
   *   messages: Array<IMessage>
   * }
   * ```
   * @returns {Promise<Object, Error>}
   */
  fetchPinned() {
    return new Promise((rs, rj) => {
      rest(this._discordie).channels.getPinnedMessages(this.id)
        .then(e => {
          e.messages = e.messages
            .map(msg => this._discordie.Messages.get(msg.id));
          return rs(e);
        })
        .catch(rj);
    });
  }

  /**
   * Makes a request to send a message to this channel. Messages over 2000
   * characters will be rejected by the server.
   *
   * Use `uploadFile` if you want to send a message with an attachment.
   * @param {String|Array<String>} content
   * Strings will be sent as is, arrays - joined with a newline character.
   * @param {IUser|IGuildMember|Array<IUser>|Array<IGuildMember>} [mentions]
   * Deprecated: left for backward compatibility.
   * @param {boolean} [tts]
   * @param {Object} [embed]
   * Refer to [official API documentation](https://discordapp.com/developers/docs/resources/channel#embed-object)
   * for embed structure description.
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
   *
   * channel.sendMessage("message with an embed", false, {
   *   color: 0x3498db,
   *   author: {name: "author name"},
   *   title: "This is an embed",
   *   url: "http://google.com",
   *   timestamp: "2016-11-13T03:43:32.127Z",
   *   fields: [{name: "some field", value: "some value"}],
   *   footer: {text: "footer text"}
   * });
   */
  sendMessage(content, mentions, tts, embed) {
    if (Array.isArray(content)) content = content.join("\n");
    if (typeof content !== "string") content = String(content);

    if (!Array.isArray(mentions)) {
      embed = tts;
      tts = mentions;
      mentions = [];
    }
    mentions = Utils.convertMentions(mentions);
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .channels.createMessage(this.id, content, mentions, tts, embed)
      .then(msg => rs(this._discordie.Messages.get(msg.id)))
      .catch(rj);
    });
  }

  /**
   * Makes a request to send typing status for this channel.
   *
   * Discord client displays it for 10 seconds, sends every 5 seconds.
   * Stops showing typing status if receives a message from the user.
   * @returns {Promise}
   */
  sendTyping() {
    return rest(this._discordie).channels.postTyping(this.id);
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
    if (mentions === true) {
      tts = mentions;
      mentions = [];
    }
    mentions = Utils.convertMentions(mentions);
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .channels.uploadFile(
          this.id, readableStream, filename,
          content, mentions, tts
        )
      .then(msg => rs(this._discordie.Messages.get(msg.id)))
      .catch(rj);
    });
  }
}

module.exports = ITextChannel;

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
   * Gets all messages in this channel.
   * @returns {Array<IMessage>}
   * @readonly
   */
  get messages() {
    return this._discordie.Messages.forChannel(this.id);
  }

  /**
   * Makes a request to fetch messages for this channel.
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
   * @param {IUser|IGuildMember|Array<IUser>|Array<IGuildMember>} [mentions]
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
   * channel.sendMessage("silent mention " + user.mention, [user]);
   * channel.sendMessage("silent with tts " + user.mention, [user], true);
   */
  sendMessage(content, mentions, tts) {
    return ITextChannel.prototype.sendMessage.apply(this, arguments);
  }

  /**
   * Makes a request to upload data to this channel.
   * Images require a `filename` with a valid extension to actually be uploaded.
   * @param {Buffer|ReadStream|String} readStream - data to upload
   * @param {String} filename - actual filename to show, required for non-string
   * @param {String} content
   * @param {boolean} [tts]
   * @returns {Promise<IMessage, Error>}
   * @example
   * channel.uploadFile(fs.readFileSync("test.png"), "test.png"); // Buffer
   * channel.uploadFile(fs.createReadStream("test.png"), "test.png"); // Stream
   * channel.uploadFile("test.png"); // File
   * channel.uploadFile("test.png", null, "file with message");
   * channel.uploadFile("test.png", null, "file with message and tts", true);
   */
  uploadFile(readStream, filename, content, mentions, tts) {
    return ITextChannel.prototype.uploadFile.apply(this, arguments);
  }

  /**
   * Makes a request to send typing status for this channel.
   *
   * Discord client displays it for 10 seconds, sends every 5 seconds.
   * Resets if client receives a message from the user.
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

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
    return new Promise((rs, rj) => {
      rest(this._discordie).channels.getMessages(this.id, limit, before, after)
      .then((e) => {
        e.messages = e.messages
          .map((msg) => this._discordie.Messages.get(msg.id));
        return rs(e);
      })
      .catch(rj);
    });
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
    if (mentions === true) {
      tts = mentions;
      mentions = [];
    }
    mentions = Utils.convertMentions(mentions);
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .channels.createMessage(this.id, content, mentions, tts)
      .then(msg => rs(this._discordie.Messages.get(msg.id)))
      .catch(rj);
    });
  }

  /**
   * Makes a request to send typing status for this channel.
   * @returns {Promise}
   */
  sendTyping() {
    return rest(this._discordie).channels.postTyping(this.id);
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
    if (mentions === true) {
      tts = mentions;
      mentions = [];
    }
    mentions = Utils.convertMentions(mentions);
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .channels.uploadFile(
          this.id, readStream, filename,
          content, mentions, tts
        )
      .then(msg => rs(this._discordie.Messages.get(msg.id)))
      .catch(rj);
    });
  }
  get isMuted() {
    // todo: add remotesettings store
    //[USER_SETTINGS_UPDATE], {"muted_channels":[ids]}
    //[USER_SETTINGS_UPDATE], {"theme":"light"}
  }
  mute() {
    //https://discordapp.com/api/users/@me/settings
  }
}

module.exports = ITextChannel;

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
 */
class ITextChannel extends IChannel {
  constructor(discordie, channelId) {
    super(discordie, channelId);
  }

  /**
   * Creates an array of IGuildMember that
   * have permissions to read this channel.
   * @returns {Array<IGuildMember>}
   */
  get members() {
    return this._discordie.Users.membersForChannel(this);
  }

  /**
   * Gets a value indicating whether it is a default (general) channel.
   * @returns {boolean}
   */
  get isDefaultChannel() {
    return this.guild_id === this.id;
  }

  /**
   * Gets a value indicating whether all messages were loaded.
   * @returns {boolean}
   */
  get allMessagesLoaded() {
    return !this._discordie._messages.channelHasMore(this.id);
  }

  /**
   * Gets all messages in this channel.
   * @returns {Array<IMessage>}
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
    if (this.allMessagesLoaded)
      return Promise.resolve([]);

    return new Promise((rs, rj) => {
      rest(this._discordie).channels.getMessages(this.id, limit, before, after)
      .then((e) => {
        e.messages = e.messages
          .map((msg) => this._discordie.Messages.get(msg.id));
        rs(e);
      })
      .catch(rj);
    });
  }

  /**
   * Makes a request to send a message to this channel.
   * @param {String} content
   * @param {IUser|IGuildMember|Array<IUser>|Array<IGuildMember>} mentions
   * @param {boolean} tts
   * @returns {Promise<IMessage, Error>}
   */
  sendMessage(content, mentions, tts) {
    if (mentions) {
      if (mentions.map)
        mentions = mentions.map(m => m.valueOf());
      else
        mentions = [mentions.valueOf()];
    }
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .channels.createMessage(this.id, content, mentions, tts)
      .then(msg => rs(this._discordie.Messages.get(msg.id)))
      .catch(rj);
    });
  }
  sendTyping() {
    return rest(this._discordie).channels.postTyping(this.id);
  }
  uploadFile(readStream, filename) {
    return new Promise((rs, rj) => {
      rest(this._discordie).channels.uploadFile(this.id, readStream, filename)
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

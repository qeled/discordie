"use strict";

const Utils = require("../core/Utils");
const User = require("../models/User");
const IChannel = require("./IChannel");
const IUser = require("./IUser");

const rest = require("../networking/rest");

class ITextChannel extends IChannel {
  constructor(discordie, channelId) {
    super(discordie, channelId);
  }
  get members() {

  }
  get isDefaultChannel() {
    return this.guild_id === this.id;
  }
  get allMessagesLoaded() {
    return !this._discordie._messages.channelHasMore(this.id);
  }
  get messages() {
    return this._discordie.Messages.forChannel(this.id);
  }
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
      .catch (rj);
    });
  }
  sendMessage(content, mentions, tts) {
    if (mentions) {
      mentions = mentions.map(mention => {
        return (mention instanceof IUser ? mention.id : mention);
      });
    }
    return new Promise((rs, rj) => {
      rest(this._discordie).channels.createMessage(this.id, content, mentions, tts)
      .then((msg) => rs(this._discordie.Messages.get(msg.id)))
      .catch (rj);
    });
  }
  sendTyping() {
    return rest(this._discordie).channels.postTyping(this.id);
  }
  uploadFile(readStream, filename) {
    return new Promise((rs, rj) => {
      rest(this._discordie).channels.uploadFile(this.id, readStream, filename)
      .then((msg) => rs(this._discordie.Messages.get(msg.id)))
      .catch (rj);
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

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
   * Checks whether this message is cached (deleted).
   * @param {IMessage} message
   * @returns {boolean}
   */
  get isCached() {
    return this.author != null;
  }
  get isEdited() {
    return this.editedTimestamp != null;
  }
  get isPrivate() {
    return this._discordie._channels.isPrivate(this.channel_id);
  }
  get channel() {
    if (this.isPrivate) {
      return this._discordie.DirectMessageChannels.get(this.channel_id);
    }
    return this._discordie.Channels.get(this.channel_id);
  }
  get guild() {
    return this.channel.guild;
  }
  get member() {
    if (this.isPrivate) return null;
    return this._discordie.Users.getMember(this.guild.id, this.author.id);
  }
  get edits() {
    return this._discordie._messages.getEdits(this.id);
  }
  edit(content, mentions) {
    mentions = mentions || this.getRaw().mentions;
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .channels.patchMessage(this.channel_id, this.id, content, mentions)
      .then(() => rs(this))
      .catch(rj);
    });
  }
  delete() {
    return rest(this._discordie)
      .channels.deleteMessage(this.channel_id, this.id);
  }
  reply(content, mentions, tts) {
    let m = this.isPrivate ? [] : [this.author];
    if (mentions && mentions.length > 0) {
      // mention only with valid `mentions` argument
      mentions = m.concat(mentions);
    }
    if (this.isPrivate) {
      return this.channel.sendMessage(content, mentions, tts);
    }
    return this.channel
      .sendMessage(`${this.author.mention}, ${content}`, mentions, tts);
  }
}

module.exports = IMessage;

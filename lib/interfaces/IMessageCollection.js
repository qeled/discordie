"use strict";

const ICollectionBase = require("./ICollectionBase");
const IMessage = require("./IMessage");
const IChannel = require("./IChannel");
const Utils = require("../core/Utils");

class IMessageCollection extends ICollectionBase {
  constructor(discordie, valuesGetter) {
    super({
      valuesGetter: valuesGetter,
      itemFactory: (id) => new IMessage(this._discordie, id)
    });
    this._discordie = discordie;
    Utils.privatify(this);
  }

  /**
   * Creates an array of `IMessage` for `channel` and sorts it by time.
   * @param {IChannel|String} channel
   * @returns {Array<IMessage>}
   */
  forChannel(channel) {
    return this.filter((message) => message.channel_id == channel.valueOf())
      .sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }

  purgeChannelCache(channelId) {
    return this._discordie._messages.purgeChannelCache(channelId.valueOf());
  }
  purgeEdits() {
    return this._discordie._messages.purgeEdits();
  }
  purgeAllCache() {
    return this._discordie._messages.purgeAllCache();
  }
}

module.exports = IMessageCollection;

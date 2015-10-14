"use strict";

const ICollectionBase = require("./ICollectionBase");
const IDirectMessageChannel = require("./IDirectMessageChannel");
const Utils = require("../core/Utils");
const Constants = require("../Constants");
const ChannelTypes = Constants.ChannelTypes;

const rest = require("../networking/rest");

class IDirectMessageChannelCollection extends ICollectionBase {
  constructor(discordie, valuesGetter) {
    super({
      valuesGetter: valuesGetter,
      itemFactory: (id) => new IDirectMessageChannel(this._discordie, id)
    });
    this._discordie = discordie;
    Utils.privatify(this);
  }
  getOrOpen(recipient) {
    const existing = this.find(c => c.recipient.equals(recipient));
    if (existing)
      return Promise.accept(existing);
    return this.open(recipient);
  }
  open(recipientId) {
    const userId = this._discordie.User.id;
    recipientId = recipientId.valueOf();
    return new Promise((rs, rj) => {
      rest(this._discordie).users.createDirectMessageChannel(userId, recipientId)
      .then((channel) => rs(this._discordie.DirectMessageChannels.get(channel.id)))
      .catch (rj);
    });
  }
}

module.exports = IDirectMessageChannelCollection;

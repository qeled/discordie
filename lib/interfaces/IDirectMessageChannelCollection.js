"use strict";

const ICollectionBase = require("./ICollectionBase");
const IDirectMessageChannel = require("./IDirectMessageChannel");
const Utils = require("../core/Utils");
const Constants = require("../Constants");
const ChannelTypes = Constants.ChannelTypes;

const rest = require("../networking/rest");

/**
 * @interface
 * @extends ICollectionBase
 */
class IDirectMessageChannelCollection extends ICollectionBase {
  constructor(discordie, valuesGetter, valueGetter) {
    super({
      valuesGetter: valuesGetter,
      valueGetter: valueGetter,
      itemFactory: (id) => new IDirectMessageChannel(this._discordie, id)
    });
    this._discordie = discordie;
    Utils.privatify(this);
  }

  /**
   * Gets a DM channel from cache or makes a request to create one.
   * @param {IUser|IGuildMember|String} recipient
   * @returns {Promise<IDirectMessageChannel, Error>}
   */
  getOrOpen(recipient) {
    const existing = this.find(c => c.recipient.equals(recipient));
    if (existing)
      return Promise.resolve(existing);
    return this.open(recipient);
  }

  /**
   * Makes a request to create a DM channel.
   * @param {IUser|IGuildMember|String} recipient
   * @returns {Promise<IDirectMessageChannel, Error>}
   */
  open(recipient) {
    const userId = this._discordie.User.id;
    recipient = recipient.valueOf();
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .users.createDirectMessageChannel(userId, recipient)
      .then(channel => rs(this._discordie.DirectMessageChannels.get(channel.id)))
      .catch(rj);
    });
  }
}

module.exports = IDirectMessageChannelCollection;

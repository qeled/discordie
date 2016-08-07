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
    const existing = this.find(c =>
      c.type === ChannelTypes.DM &&
      c.recipients.length === 1 &&
      c.recipients[0].equals(recipient)
    );
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
    recipient = recipient.valueOf();
    return this.createGroupDM([recipient]);
  }

  /**
   * Makes a request to create a group DM channel.
   * @param {Array<IUser|IGuildMember|String>} [recipients]
   * @returns {Promise<IDirectMessageChannel, Error>}
   */
  createGroupDM(recipients) {
    recipients = recipients || [];
    recipients = recipients.filter(u => u).map(u => u.valueOf());
    const userId = this._discordie.User.id;
    return new Promise((rs, rj) => {
      rest(this._discordie)
        .users.createDirectMessageChannel(userId, recipients)
      .then(c => rs(this._discordie.DirectMessageChannels.get(c.id)))
      .catch(rj);
    });
  }
}

module.exports = IDirectMessageChannelCollection;

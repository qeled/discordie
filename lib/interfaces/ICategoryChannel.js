"use strict";

const IChannel = require("./IChannel");

/**
 * @interface
 * @model Channel
 * @extends IChannel
 */
class ICategoryChannel extends IChannel {
  constructor(discordie, channelId) {
    super(discordie, channelId);
  }

  /**
   * Gets children of this category.
   * @returns {Array<IChannel>}
   * @readonly
   */
  get children() {
    return this._discordie.Channels.childrenForCategory(this);
  }
}

module.exports = ICategoryChannel;

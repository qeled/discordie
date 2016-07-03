"use strict";

const Utils = require("../core/Utils");

const rest = require("../networking/rest");

/**
 * @interface
 */
class IInviteManager {
  constructor(discordie) {
    this._discordie = discordie;
    Utils.privatify(this);
    Object.freeze(this);
  }

  /**
   * Makes a request to create an invite.
   * See `IChannel.createInvite` for more info.
   * @see IChannel.createInvite
   * @param {IChannel|String} channel
   * @param {Object} options
   * @returns {Promise<Object, Error>}
   */
  create(channel, options) {
    options = options || {
      max_age: 60 * 30,
      // value in seconds
      max_uses: 0,
      // pretty obvious
      temporary: false
      // temporary membership, kicks members without roles on disconnect
    };
    channel = channel.valueOf();
    return rest(this._discordie).invites.createInvite(channel, options);
  }

  /**
   * Makes a request to regenerate existing invite.
   * @param {Object|String} code
   * @returns {Promise<Object, Error>}
   */
  regenerate(code) {
    if (code && code.code) code = code.code;
    const options = {regenerate: code};
    return rest(this._discordie).invites.createInvite(channel, options);
  }

  /**
   * Makes a request to revoke existing invite.
   * @param {Object|String} code
   * @returns {Promise<Object, Error>}
   */
  revoke(code) {
    if (code && code.code) code = code.code;
    return rest(this._discordie).invites.deleteInvite(code);
  }

  /**
   * Makes a request to resolve existing invite.
   * @param {Object|String} code
   * @returns {Promise<Object, Error>}
   * @example
   * client.Invites.resolve("Zt5yW").then(console.log).catch(console.log);
   * // Example response:
   * {
   *   "code": "Zt5yW",
   *   "guild": {
   *     "splash_hash": null,
   *     "id": "00000000000000000",
   *     "name": "test"
   *   },
   *   "channel": {
   *     "type": "text",
   *     "id": "000000000000000000",
   *     "name": "testchannel"
   *   }
   * }
   */
  resolve(code) {
    if (code && code.code) code = code.code;
    return rest(this._discordie).invites.getInvite(code);
  }

  /**
   * **Deprecated**: Only works with user accounts.
   * Bot accounts can be invited by users with Manage Server permission using
   * the `https://discordapp.com/oauth2/authorize?client_id=%APP_ID%&scope=bot`
   * page. See official Discord API documentation for more info.
   *
   * Makes a request to accept existing invite.
   * @param {Object|String} code
   * @returns {Promise<Object, Error>}
   */
  accept(code) {
    if (code && code.code) code = code.code;
    return rest(this._discordie).invites.postInvite(code);
  }
}

module.exports = IInviteManager;

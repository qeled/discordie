"use strict";

const Constants = require("../Constants");

const IBase = require("./IBase");
const Utils = require("../core/Utils");

const Call = require("../models/Call");

/**
 * @interface
 * @model Call
 * @extends IBase
 */
class ICall extends IBase {
  constructor(discordie, directMessageChannelId) {
    super();
    Utils.definePrivate(this, {
      _discordie: discordie,
      _directMessageChannelId: directMessageChannelId
    });

    Object.freeze(this);
  }

  /**
   * Gets date and time this call was created at.
   * @returns {Date}
   * @readonly
   */
  get createdAt() {
    const call = this._discordie._calls.get(this._directMessageChannelId);
    if (!call) return new Date(null);

    return new Date(Utils.timestampFromSnowflake(call.message_id));
  }

  /**
   * Checks if the call is ringing for current user.
   * @return {boolean}
   * @readonly
   */
  get isRinging() {
    const call = this._discordie._calls.get(this._directMessageChannelId);
    if (!call) return false;

    const userId = this._discordie._user && this._discordie._user.id;
    if (!userId) return false;

    return call.ringing ? call.ringing.indexOf(userId) >= 0 : false;
  }
}

ICall._inherit(Call, function modelPropertyGetter(key) {
  return this._discordie._calls.get(this._directMessageChannelId)[key];
});

/**
 * @readonly
 * @instance
 * @memberOf ICall
 * @name ringing
 * @returns {Array<IUser>|null}
 */
ICall._setValueOverride("ringing", function(ringing) {
  const users = [];
  if (!ringing) return users;
  for (let id of ringing) {
    const user = this._discordie.Users.get(id);
    if (user) users.push(user);
  }
  return users;
});

module.exports = ICall;

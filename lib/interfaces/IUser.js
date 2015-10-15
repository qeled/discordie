"use strict";

const IBase = require("./IBase");
const IMessage = require("./IMessage");
const IPermissions = require("./IPermissions");
const Utils = require("../core/Utils");
const User = require("../models/User");
const Constants = require("../Constants");
const Endpoints = Constants.Endpoints;

class IUser extends IBase {
  constructor(discordie, userId) {
    super(User, (key) => this._discordie._users.get(this._userId)[key]);
    this._discordie = discordie;
    this._userId = userId;
    if (this.constructor == IUser) {
      Utils.privatify(this);
      Object.freeze(this);
    }
  }
  isMentioned(message) {
    if (!(message instanceof IMessage)) {
      if (!message.id)
        return false;
      message = this._discordie.Messages.get(message);
    }
    if (!message)
      return false;

    return message.mentions.some(mention => mention.id === this.id) ||
      message.mention_everyone;
  }
  openDM() {
    return this._discordie.DirectMessageChannels.getOrOpen(this);
  }
  get avatarURL() {
    if (!this.avatar) return null;
    return Constants.API_ENDPOINT + Endpoints.AVATAR(this.id, this.avatar);
  }
  get status() {
    return this._discordie._presences.getStatus(this.id);
  }
  get gameId() {
    return this._discordie._presences.getGame(this.id);
  }
  get previousStatus() {
    return this._discordie._presences.getPreviousStatus(this.id);
  }
  get previousGameId() {
    return this._discordie._presences.getPreviousGame(this.id);
  }
  memberOf(guild) {
    return this._discordie.Users.getMember(guild.valueOf(), this.id) || null;
  }

  permissionsFor(context) {
    return IPermissions.resolve(this, context);
  }
  can(permission, context) {
    return (IPermissions.resolve(this, context).raw & permission) != 0;
  }

  get mention() {
    return `<@${this.id}>`;
  }
}

module.exports = IUser;

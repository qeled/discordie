"use strict";

const Constants = require("../Constants");
const Endpoints = Constants.Endpoints;
const ChannelTypes = Constants.ChannelTypes;

const IBase = require("./IBase");
const ITextChannel = require("./ITextChannel");
const ICall = require("./ICall");
const Utils = require("../core/Utils");
const Channel = require("../models/Channel");

const rest = require("../networking/rest");

/**
 * @interface
 * @model Channel
 * @extends IBase
 */
class IDirectMessageChannel extends IBase {
  constructor(discordie, directMessageChannelId) {
    super();
    Utils.definePrivate(this, {
      _discordie: discordie,
      _directMessageChannelId: directMessageChannelId,
      _call: new ICall(discordie, directMessageChannelId)
    });

    Object.freeze(this);
  }

  /**
   * **Deprecated**: Removed in API v6. Use `isPrivate` instead.
   * @return {boolean|null}
   * @readonly
   */
  get is_private() {
    return this.isPrivate;
  }

  /**
   * Checks whether this channel is a direct message channel or a group.
   * @return {boolean|null}
   * @readonly
   */
  get isPrivate() {
    if (!this._valid) return null;
    return this._discordie._channels._isPrivate(this);
  }

  /**
   * Returns the owner of the private channel.
   *
   * Returns null if the owner user is not in cache or there is no owner.
   * @returns {IAuthenticatedUser|IUser|null}
   * @readonly
   */
  get owner() {
    if (!this.owner_id) return null;
    const owner = this._discordie.Users.get(this.owner_id);
    if (!owner) return null;
    if (this._discordie.User.equals(owner))
      return this._discordie.User;
    return owner;
  }

  /**
   * Checks whether the `user` is the owner of the private channel.
   * @param {IGuildMember|IUser|IAuthenticatedUser|String} user
   * @returns {boolean}
   */
  isOwner(user) {
    if (!user) return false;
    if (!this.owner_id) return false;
    return this.owner_id === user.valueOf();
  }

  /**
   * Creates a string URL of image icon of this channel.
   * @returns {String|null}
   * @readonly
   */
  get iconURL() {
    if (!this.icon) return null;
    return Constants.CDN_ENDPOINT + Endpoints.CDN_DM_ICON(this.id, this.icon);
  }

  /**
   * Gets first recipient of this channel.
   *
   * Returns null if this channel is invalid or has no recipients.
   *
   * **Deprecated**: Use `recipients` instead.
   * @returns {IUser|null}
   * @readonly
   */
  get recipient() {
    if (!this._valid) return null;
    return this.recipients[0] || null;
  }

  /**
   * Gets a value indicating whether all messages were loaded.
   * @returns {boolean}
   * @readonly
   */
  get allMessagesLoaded() {
    return !this._discordie._messages.channelHasMore(this.id);
  }

  /**
   * Creates an array of cached messages in this channel, sorted in order of
   * arrival (message cache is sorted on message insertion, not when this
   * getter is invoked).
   *
   * Returns an empty array if channel no longer exists.
   * @returns {Array<IMessage>}
   * @readonly
   */
  get messages() {
    return this._discordie.Messages.forChannel(this.id);
  }

  /**
   * Makes a request to fetch messages for this channel.
   *
   * Discord API does not allow fetching more than 100 messages at once.
   *
   * Promise resolves with an Object with following structure:
   * ```js
   * {
   *   messages: Array<IMessage>,
   *   limit: Number, // same as parameter passed or default value
   *   before: String | null, // message id
   *   after: String | null // message id
   * }
   * ```
   * @param {Number|null} [limit] - Default is 100
   * @param {IMessage|String|null} [before] - Message or message id
   * @param {IMessage|String|null} [after] - Message or message id
   * @returns {Promise<Object, Error>}
   * @example
   * var guild = client.Guilds.find(g => g.name == "test");
   * var channel = guild.generalChannel;
   *
   * // simple fetch:
   * channel.fetchMessages().then(() => {
   *   console.log("[simple] messages in cache: " + channel.messages.length);
   * });
   *
   * // fetching more than 100 messages into cache sequentially:
   * fetchMessagesEx(channel, 420).then(() => {
   *   console.log("[extended] messages in cache: " + channel.messages.length);
   * });
   *
   * // fetch more messages just like Discord client does
   * function fetchMessagesEx(channel, left) {
   *   // message cache is sorted on insertion
   *   // channel.messages[0] will get oldest message
   *   var before = channel.messages[0];
   *   return channel.fetchMessages(left, before)
   *          .then(e => onFetch(e, channel, left));
   * }
   * function onFetch(e, channel, left) {
   *   if (!e.messages.length) return Promise.resolve();
   *   left -= e.messages.length;
   *   console.log(`Received ${e.messages.length}, left: ${left}`);
   *   if (left <= 0) return Promise.resolve();
   *   return fetchMessagesEx(channel, left);
   * }
   */
  fetchMessages(limit, before, after) {
    return ITextChannel.prototype.fetchMessages.apply(this, arguments);
  }

  /**
   * Creates an array of cached pinned messages in this channel.
   *
   * Pinned message cache is updated only if all pinned messages have been
   * loaded with `IDirectMessageChannel.fetchPinned()`.
   *
   * Returns an empty array if channel no longer exists or if pinned messages
   * have not been fetched yet.
   * @returns {Array<IMessage>}
   * @readonly
   */
  get pinnedMessages() {
    return this._discordie.Messages.forChannelPinned(this.id);
  }

  /**
   * Makes a request to fetch pinned messages for this channel.
   *
   * Promise resolves with an Object with following structure:
   * ```js
   * {
   *   channelId: String,
   *   messages: Array<IMessage>
   * }
   * ```
   * @returns {Promise<Object, Error>}
   */
  fetchPinned() {
    return new Promise((rs, rj) => {
      rest(this._discordie).channels.getPinnedMessages(this.id)
        .then(e => {
          e.messages = e.messages
            .map(msg => this._discordie.Messages.get(msg.id));
          return rs(e);
        })
        .catch(rj);
    });
  }

  /**
   * Makes a request to send a message to this channel.
   * @param {String} content
   * @param {IUser|IGuildMember|Array<IUser>|Array<IGuildMember>} [mentions]
   * Deprecated: left for backward compatibility.
   * @param {boolean} [tts]
   * @returns {Promise<IMessage, Error>}
   * @example
   * var guild = client.Guilds.find(g => g.name == "test");
   * if (!guild) return console.log("invalid guild");
   *
   * var channel = guild.generalChannel;
   *
   * channel.sendMessage("regular message");
   * channel.sendMessage("test with tts", true);
   *
   * var user = client.Users.find(u => u.username == "test");
   * if (!user) return console.log("invalid user");
   *
   * channel.sendMessage("mentioning user " + user.mention);
   * channel.sendMessage("@everyone or @here mention if you have permissions");
   */
  sendMessage(content, mentions, tts) {
    return ITextChannel.prototype.sendMessage.apply(this, arguments);
  }

  /**
   * Makes a request to upload data to this channel.
   * Images require a `filename` with a valid extension to actually be uploaded.
   * @param {Buffer|ReadableStream|String} readableStream
   * Data to upload or filename as a string
   * @param {String} filename
   * Actual filename to show, required for non-string `readableStream`
   * @param {String} [content] - Additional comment message for attachment
   * @param {boolean} [tts]
   * @returns {Promise<IMessage, Error>}
   * @example
   * channel.uploadFile(fs.readFileSync("test.png"), "test.png"); // Buffer
   * channel.uploadFile(fs.createReadStream("test.png"), "test.png"); // Stream
   * channel.uploadFile("test.png"); // File
   * channel.uploadFile("test.png", null, "file with message");
   * channel.uploadFile("test.png", null, "file with message and tts", true);
   */
  uploadFile(readableStream, filename, content, mentions, tts) {
    return ITextChannel.prototype.uploadFile.apply(this, arguments);
  }

  /**
   * Makes a request to send typing status for this channel.
   *
   * Discord client displays it for 10 seconds, sends every 5 seconds.
   * Stops showing typing status if receives a message from the user.
   * @returns {Promise}
   */
  sendTyping() {
    return ITextChannel.prototype.sendTyping.apply(this, arguments);
  }

  /**
   * Makes a request to close this channel (direct message channels only).
   * @returns {Promise}
   */
  close() {
    return rest(this._discordie).channels.deleteChannel(this.id);
  }

  /**
   * Makes a request to ring specified recipients.
   * Has no effect if call has not started yet.
   *
   * Bot accounts cannot use this endpoint.
   * @param {Array<IUser|String>} [recipients]
   * @return {Promise}
   */
  ring(recipients) {
    if (recipients && !Array.isArray(recipients))
      throw new TypeError("Param 'recipients' is not an array");

    if (recipients) recipients = recipients.map(u => u.valueOf());
    return rest(this._discordie).channels.calls
      .ring(this.id, recipients);
  }

  /**
   * Makes a request to decline an incoming call (if no arguments passed) or
   * stop ringing for specified recipients.
   *
   * Bot accounts cannot use this endpoint.
   * @param {Array<IUser|String>} [recipients]
   * @return {Promise}
   */
  stopRinging(recipients) {
    if (recipients && !Array.isArray(recipients))
      throw new TypeError("Param 'recipients' is not an array");

    if (recipients) recipients = recipients.map(u => u.valueOf());
    return rest(this._discordie).channels.calls
      .stopRinging(this.id, recipients);
  }

  /**
   * Makes a request to change the server region hosting the call.
   *
   * Bot accounts cannot use this endpoint.
   * @param {String} region
   * @return {Promise}
   */
  changeCallRegion(region) {
    return rest(this._discordie).channels.calls.changeRegion(this.id, region);
  }

  /**
   * Makes a request to add a user to this private channel.
   *
   * Bot accounts cannot use this endpoint.
   * @param {IUser|IGuildMember} user
   * @return {Promise}
   */
  addRecipient(user) {
    user = user.valueOf();
    return rest(this._discordie).channels.dm.addRecipient(this.id, user);
  }

  /**
   * Makes a request to remove a user from this private channel.
   *
   * Bot accounts cannot use this endpoint.
   * @param {IUser|IGuildMember} user
   * @return {Promise}
   */
  removeRecipient(user) {
    user = user.valueOf();
    return rest(this._discordie).channels.dm.removeRecipient(this.id, user);
  }

  /**
   * Makes a request to set a name for this private channel.
   * @param {String} name
   * @return {Promise<IDirectMessageChannel, Error>}
   */
  setName(name) {
    return new Promise((rs, rj) => {
      rest(this._discordie).channels.dm.setName(this.id, name)
      .then(() => rs(this))
      .catch(rj);
    });
  }

  /**
   * Makes a request to set an icon for this private channel.
   * @param {String|Buffer|null} icon
   * @return {Promise<IDirectMessageChannel, Error>}
   */
  setIcon(icon) {
    if (icon instanceof Buffer) {
      icon = Utils.imageToDataURL(icon);
    } else if (icon === undefined) {
      icon = this.icon;
    }

    return new Promise((rs, rj) => {
      rest(this._discordie).channels.dm.setIcon(this.id, icon)
      .then(() => rs(this))
      .catch(rj);
    });
  }

  /**
   * Creates or joins a call.
   * Only one call can be connected at the same time.
   *
   * Joining calls with bot accounts is not supported.
   * @param {boolean} [selfMute]
   * @param {boolean} [selfDeaf]
   * @returns {Promise<VoiceConnectionInfo, Error|Number>}
   */
  joinCall(selfMute, selfDeaf) {
    selfMute = !!selfMute;
    selfDeaf = !!selfDeaf;

    if (!this._valid)
      return Promise.reject(new Error("Channel does not exist"));

    const call = this._discordie._calls.get(this._directMessageChannelId);
    if (call && call.unavailable)
      return Promise.reject(new Error("Call is unavailable"));

    if (this._discordie._user && this._discordie._user.bot)
      throw new Error("Joining calls with bot accounts is not supported");

    const vc = this._discordie.VoiceConnections;
    return vc._getOrCreate(null, this.id, selfMute, selfDeaf);
  }

  /**
   * Leaves call if joined.
   */
  leaveCall() {
    const info = this.getVoiceConnectionInfo();
    if (info) return info.voiceConnection.disconnect();

    this._discordie.VoiceConnections
      .cancelIfPending(null, this._directMessageChannelId);
  }

  /**
   * Retrieves `VoiceConnectionInfo` for the call of this channel.
   * @returns {VoiceConnectionInfo|null}
   */
  getVoiceConnectionInfo() {
    return this._discordie.VoiceConnections
      .getForChannel(this._directMessageChannelId);
  }

  /**
   * Checks whether current user is in the call.
   * @returns {boolean}
   * @readonly
   */
  get joinedCall() {
    const vc = this._discordie.VoiceConnections;
    const pendingChannel = vc.getPendingChannel(null);
    const channelId = this._directMessageChannelId;
    return !!(pendingChannel && pendingChannel === channelId);
  }

  /**
   * Creates an array of users in the call.
   *
   * Returns null if call does not exist in cache or has not started yet.
   * @returns {Array<IUser>|null}
   * @readonly
   */
  get usersInCall() {
    const call = this._discordie._calls.get(this._directMessageChannelId);
    return this._discordie.Users.usersInCall(this);
  }

  /**
   * Gets call from cache.
   *
   * Returns null if call does not exist in cache or has not started yet.
   * @returns {ICall|null}
   * @readonly
   */
  get call() {
    const call = this._discordie._calls.get(this._directMessageChannelId);
    return call ? this._call : null;
  }

  /**
   * Fetches call info through gateway socket.
   *
   * Currently there are no ways to fetch call info for all channels at once.
   * @return {Promise<ICall|null, Error>}
   */
  fetchCall() {
    const gateway = this._discordie.gatewaySocket;
    if (!gateway || !gateway.connected)
      return Promise.reject(new Error("No gateway socket (not connected)"));

    return new Promise((rs, rj) => {
      const call = this._discordie._calls.get(this._directMessageChannelId);
      if (call) return rs(this._call);

      gateway.callConnect(this._directMessageChannelId);

      setTimeout(() => {
        const call = this._discordie._calls.get(this._directMessageChannelId);
        rs(call ? this._call : null);
      }, 1000);
    });
  }
}

IDirectMessageChannel._inherit(Channel, function modelPropertyGetter(key) {
  return this._discordie._channels.get(this._directMessageChannelId)[key];
});

/**
 * @readonly
 * @instance
 * @memberOf IDirectMessageChannel
 * @name name
 * @returns {String}
 */
IDirectMessageChannel._setValueOverride("name", function(name) {
  const UNNAMED = "Unnamed";
  if (!this._valid) return UNNAMED;

  const type = this.type;
  if (type === ChannelTypes.DM) {
    const recipient = this.recipients[0];
    return recipient ? recipient.username : name;
  }
  if (type === ChannelTypes.GROUP_DM) {
    return name || this.recipients.map(u => u.username).join(", ") || UNNAMED;
  }

  return name;
});

/**
 * Gets recipients of this channel.
 * @readonly
 * @instance
 * @memberOf IDirectMessageChannel
 * @name recipients
 * @returns {Array<IUser>|null}
 */
IDirectMessageChannel._setValueOverride("recipients", function(recipients) {
  const users = [];
  if (!recipients) return users;
  for (let id of recipients.values()) {
    const user = this._discordie.Users.get(id);
    if (user) users.push(user);
  }
  return users;
});


module.exports = IDirectMessageChannel;

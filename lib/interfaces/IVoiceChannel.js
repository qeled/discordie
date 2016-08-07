"use strict";

const Utils = require("../core/Utils");
const User = require("../models/User");
const IChannel = require("./IChannel");

/**
 * @interface
 * @model Channel
 * @extends IChannel
 */
class IVoiceChannel extends IChannel {
  constructor(discordie, channelId) {
    super(discordie, channelId);
  }

  /**
   * Creates an array of members joined in this voice channels.
   * @returns {Array<IGuildMember>}
   * @readonly
   */
  get members() {
    return this._discordie.Users.membersInVoiceChannel(this);
  }

  /**
   * Checks whether current user is in this voice channel.
   * @returns {boolean}
   * @readonly
   */
  get joined() {
    const vc = this._discordie.VoiceConnections;
    const pendingChannel = vc.getPendingChannel(this.guild_id);
    return !!(pendingChannel && pendingChannel === this._channelId);
  }

  /**
   * Joins this voice channel.
   * Creates a new voice connection if there are no active connections for
   * this channels' guild.
   *
   * > **Note:** One account can be only in one channel per guild.
   * >           Promise will resolve instantly and contain the same instance
   * >           if connection to the server is already established.
   *
   * If there is a pending connection for the guild this channel belongs to,
   * it will return the same promise.
   *
   * Checks permissions locally and returns a rejected promise with:
   *
   * - **`Error "Missing permission"`** if `Voice.CONNECT` permission is denied.
   *
   * - **`Error "Channel is full"`** if `Voice.MOVE_MEMBERS` permission is
   *   denied and channel is full.
   *
   * Returns a rejected promise with **`Error "Channel does not exist"`** if
   * guild is unavailable or channel does not exist in cache.
   *
   * Returned promise can be cancelled or rejected: see `VOICE_DISCONNECTED`
   * event for more info.
   *
   * @param {boolean} [selfMute]
   * @param {boolean} [selfDeaf]
   * @returns {Promise<VoiceConnectionInfo, Error|Number>}
   */
  join(selfMute, selfDeaf) {
    selfMute = !!selfMute;
    selfDeaf = !!selfDeaf;

    if (!this._valid)
      return Promise.reject(new Error("Channel does not exist"));

    // check permissions locally
    // since server silently drops invalid voice state updates
    if (!this.joined) {
      const permissions = this._discordie.User.permissionsFor(this);
      if (!permissions.Voice.CONNECT)
        return Promise.reject(new Error("Missing permission"));

      if (this.user_limit > 0) {
        const states = this._discordie._voicestates.getStatesInChannel(this.id);
        if (states.size >= this.user_limit) {
          if (!permissions.Voice.MOVE_MEMBERS)
            return Promise.reject(new Error("Channel is full"));
        }
      }
    }

    const vc = this._discordie.VoiceConnections;
    return vc._getOrCreate(this.guild_id, this._channelId, selfMute, selfDeaf);
  }

  /**
   * Leaves this voice channel if joined.
   */
  leave() {
    const info = this.getVoiceConnectionInfo();
    if (info) return info.voiceConnection.disconnect();

    this._discordie.VoiceConnections
      .cancelIfPending(this.guild_id, this._channelId);
  }

  /**
   * Retrieves `VoiceConnectionInfo` for this voice channel.
   * @returns {VoiceConnectionInfo|null}
   */
  getVoiceConnectionInfo() {
    return this._discordie.VoiceConnections.getForChannel(this._channelId);
  }
}

module.exports = IVoiceChannel;

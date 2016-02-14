"use strict";

const Utils = require("../core/Utils");


function initInterface(_interface, _options) {
  if (!_interface)
    throw new TypeError("Invalid interface");
  if (_options) _interface.initialize(_options);
  return _interface;
}

/**
 * @interface
 */
class IVoiceConnection {
  constructor(discordie, gw) {
    // todo: ssrc to user
    //discordie.Dispatcher.on(Events.VOICE_SPEAKING, e => {
    //  if (e.socket == voicews) this.emit("speaking", - bla - resolve ssrc)
    //});

    this._gatewaySocket = gw;

    if (!this.canStream)
      throw new Error("Failed to create IVoiceConnection");

    this._discordie = discordie;
    Utils.privatify(this);
  }
  dispose() {
    this._gatewaySocket = null;
  }

  /**
   * Checks whether this voice connection is no longer valid.
   * @returns {boolean}
   * @readonly
   */
  get disposed() {
    return !this._gatewaySocket;
  }

  get _voiceSocket() {
    if (!this._gatewaySocket) return null;
    return this._gatewaySocket.voiceSocket;
  }

  /**
   * Checks whether this voice connection is fully initialized.
   * @returns {boolean}
   * @readonly
   */
  get canStream() {
    return this._voiceSocket && this._voiceSocket.canStream;
  }

  /**
   * Gets channel of this voice connection.
   * Returns null if guild became unavailable or doesn't exist in cache.
   * @returns {IChannel|null}
   * @readonly
   */
  get channel() {
    const gw = this._gatewaySocket;
    if (!gw) return null;
    return this._discordie.Channels.get(gw.voiceState.channelId);
  }

  /**
   * Gets channel id of this voice connection.
   * Returns null if voice connection is disposed.
   * @returns {String|null}
   * @readonly
   */
  get channelId() {
    const gw = this._gatewaySocket;
    if (!gw) return null;
    return gw.voiceState.channelId;
  }

  /**
   * Gets guild of this voice connection.
   * Returns null if guild became unavailable or doesn't exist in cache.
   * @returns {IGuild|null}
   * @readonly
   */
  get guild() {
    const gw = this._gatewaySocket;
    if (!gw) return null;
    return this._discordie.Guilds.get(gw.voiceState.guildId);
  }

  /**
   * Gets guild id of this voice connection.
   * Returns null if voice connection is disposed.
   * @returns {String|null}
   * @readonly
   */
  get guildId() {
    const gw = this._gatewaySocket;
    if (!gw) return null;
    return gw.voiceState.guildId;
  }

  /**
   * Resolves a user object from source id assigned to this voice connection.
   * @param {Number} ssrc
   * @returns {IUser}
   */
  ssrcToUser(ssrc) {
    const userid = this._discordie._voicestates.ssrcToUserId(this, ssrc);
    if (!userid) return null;
    return this._discordie.Users.get(userid) || null;
  }

  /**
   * Resolves a member object from source id assigned to this voice connection.
   * @param {Number} ssrc
   * @returns {IGuildMember}
   */
  ssrcToMember(ssrc) {
    const userid = this._discordie._voicestates.ssrcToUserId(this, ssrc);
    if (!userid) return null;
    return this._discordie.Users.getMember(this.guild, userid);
  }

  createEncoderStream(options) {

  }
  createDecoderStream(options) {

  }

  /**
   * Initializes or gets existing encoder instance for this voice connection.
   * Reinitializes if options changed.
   * @param {Object} options
   * @returns {AudioEncoder}
   */
  getEncoder(options) {
    if (!this._voiceSocket) return null;
    return initInterface(this._voiceSocket.audioEncoder, options);
  }

  /**
   * Initializes or gets existing decoder instance for this voice connection.
   * Reinitializes if options changed.
   * @param {Object} options
   * @returns {AudioDecoder}
   */
  getDecoder(options) {
    if (!this._voiceSocket) return null;
    return initInterface(this._voiceSocket.audioDecoder, options);
  }

  /**
   * Disconnects this voice connection.
   */
  disconnect() {
    if (!this._gatewaySocket) return;
    this._gatewaySocket.disconnectVoice();
  }
}

module.exports = IVoiceConnection;

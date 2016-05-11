"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const Backoff = require("./Backoff");

/**
 * @class
 */
class GatewayReconnectHandler {
  constructor(discordie) {
    this._discordie = discordie;
    this._backoff = new Backoff(1000, 60000);
    this._enabled = false;

    this._disconnectCallback = e => {
      if (!this._enabled) return;
      e.autoReconnect = true;
      e.delay = this._backoff.fail(() => discordie.connect());
    };
    this._resetCallback = () => this._backoff.reset();

    discordie.Dispatcher.on(Events.DISCONNECTED, this._disconnectCallback);
    discordie.Dispatcher.on(Events.GATEWAY_READY, this._resetCallback);
    discordie.Dispatcher.on(Events.GATEWAY_RESUMED, this._resetCallback);
  }

  /**
   * Enables auto-reconnect.
   */
  enable() { this._enabled = true; }

  /**
   * Disables auto-reconnect.
   */
  disable() { this._enabled = false; }

  /**
   * Boolean indicating whether auto-reconnect is enabled.
   * @returns {boolean}
   * @readonly
   */
  get enabled() { return this._enabled; }

  /**
   * Gets/sets minimum delay in milliseconds. Must be >= 0.
   *
   * Default is 1000.
   * @returns {Number}
   */
  get min() { return this._backoff.min; }
  /**
   * @ignore
   * @type {Number}
   **/
  set min(value) { this._backoff.min = value; }

  /**
   * Gets/sets maximum delay in milliseconds. Must be >= 5000.
   *
   * Default is 60000.
   * @returns {Number}
   */
  get max() { return this._backoff.max; }
  /**
   * @ignore
   * @type {Number}
   **/
  set max(value) { this._backoff.max = value; }
}

module.exports = GatewayReconnectHandler;

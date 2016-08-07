"use strict";

const DiscordieError = require("./DiscordieError");
const Constants = require("../Constants");
const EventTypes = Object.keys(Constants.Events);

const events = require("events");

let lastEvent = null;

function validateEvent(eventType) {
  if (EventTypes.indexOf(eventType) < 0)
    throw new DiscordieError(`Invalid event '${eventType}'`);
}

class DiscordieDispatcher extends events.EventEmitter {
  constructor() {
    super();
    this._anyeventlisteners = [];
    this.setMaxListeners(14);
  }
  static _getLastEvent() { return lastEvent; }
  on(eventType, listener) {
    validateEvent(eventType);
    return super.on.apply(this, arguments);
  }
  onAny(fn) {
    if (typeof fn !== "function")
      return this;
    this._anyeventlisteners.push(fn);
    return this;
  }
  emit(eventType) {
    validateEvent(eventType);

    lastEvent = [].slice.call(arguments);
    super.emit.apply(this, arguments);
    const _arguments = arguments;
    this._anyeventlisteners.forEach((fn) => {
      fn.apply(this, _arguments);
    });
  }
  hasListeners(eventType) {
    validateEvent(eventType);

    if (this._anyeventlisteners.length || this.listenerCount(eventType))
      return true;
    return false;
  }
}

module.exports = DiscordieDispatcher;

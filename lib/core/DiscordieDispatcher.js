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
  }
  static _getLastEvent() { return lastEvent; }
  on(eventType) {
    validateEvent(eventType);
    super.on.apply(this, arguments);
  }
  onAny(fn) {
    if (typeof fn !== "function")
      return;
    this._anyeventlisteners.push(fn);
  }
  emit(eventType) {
    validateEvent(eventType);

    lastEvent = [].slice.call(arguments);
    super.emit.apply(this, arguments);
    const _arguments = arguments;
    this._anyeventlisteners.forEach((fn) => {
      fn.apply(null, _arguments);
    });
  }
}

module.exports = DiscordieDispatcher;

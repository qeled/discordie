"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const Utils = require("../core/Utils");

function emitReady(gw) {
  const ready = this._readyPayload;

  if (!this._readyPayload) return;
  this._readyPayload = null;

  if (!this._discordie.connected) return;

  if (gw.isPrimary) {
    this._discordie.Dispatcher.emit(Events.GATEWAY_READY, {
      socket: gw,
      data: ready
    });
  }
  this._discordie.Dispatcher.emit(Events.ANY_GATEWAY_READY, {
    socket: gw,
    data: ready
  });
}

function handleConnectionOpen(data, e) {
  this._readyPayload = data;
  this._collections = new Set(this._registeredCollections);
  this._tasks = Array.from(this._registeredTasks);
  return true;
}

function executeNextTask(gw) {
  if (!this._readyPayload || !this._tasks.length) return;
  const nextTask = this._tasks.shift();
  nextTask.handler._executeReadyTask(this._readyPayload, gw);
}

class ReadyEventScheduler {
  constructor(discordie, gateway) {
    this._discordie = discordie;

    this._readyPayload = null;

    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      if (e.socket != gateway()) return;

      Utils.bindGatewayEventHandlers(this, e, {
        READY: handleConnectionOpen
      });
    });

    discordie.Dispatcher.on(Events.GATEWAY_DISCONNECT, e => {
      if (e.socket != gateway()) return;

      this._readyPayload = null;
    });

    // parallel

    this._registeredCollections = new Set();
    this._collections = new Set();
    discordie.Dispatcher.on(Events.COLLECTION_READY, e => {
      this._collections.delete(e.collection);
      if (this._collections.size) return;

      executeNextTask.call(this, gateway());
    });

    // sequential

    this._registeredTasks = [];
    this._tasks = [];
    discordie.Dispatcher.on(Events.READY_TASK_FINISHED, lastTask => {
      const idx = this._tasks.findIndex(t => t.handler === lastTask.handler);
      this._tasks.splice(idx, 1);

      if (!this._tasks.length) {
        return setImmediate(() => emitReady.call(this, gateway()));
      }

      executeNextTask.call(this, gateway());
    });

    Utils.privatify(this);
  }
  _waitFor(collection) {
    this._registeredCollections.add(collection);
  }
  _addTask(name, handler) {
    if (typeof name !== "string") {
      throw new TypeError(
        "ReadyEventScheduler: Invalid task name " + name
      );
    }
    if (typeof handler._executeReadyTask !== "function") {
      throw new TypeError(
        "ReadyEventScheduler: Invalid handler for task " + name
      );
    }
    this._registeredTasks.push({name, handler});
  }
}

module.exports = ReadyEventScheduler;

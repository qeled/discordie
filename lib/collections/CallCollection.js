"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");

const Call = require("../models/Call");

function emitRing(gw, channelId) {
  const channel = this._discordie.DirectMessageChannels.get(channelId);
  if (!channel) return;

  this._discordie.Dispatcher.emit(Events.CALL_RING, {
    socket: gw,
    channel: channel
  });
}

function checkRing(gw, prev, next) {
  const channelId = next.channel_id;
  const userId = this._discordie._user && this._discordie._user.id;
  if (!channelId || !userId) return;
  if (!next || !next.ringing) return;

  const hasPrev = prev ? prev.ringing.indexOf(userId) >= 0 : false;
  const hasNext = next.ringing.indexOf(userId) >= 0;

  if (!hasPrev && hasNext) emitRing.call(this, gw, channelId);
}

function handleConnectionOpen(data) {
  this.clear();
  return true;
}

function handleCallCreate(call, e) {
  this.set(call.channel_id, new Call(call));
  checkRing.call(this, e.socket, null, call);
  return true;
}

function handleCallUpdate(call, e) {
  const prev = this.get(call.channel_id);
  this.mergeOrSet(call.channel_id, new Call(call));
  checkRing.call(this, e.socket, prev, call);
  return true;
}

function handleCallDelete(call) {
  const _call = this.get(call.channel_id);
  if (!_call) return true;

  if (call.unavailable === true) {
    this.mergeOrSet(call.channel_id, {unavailable: true});
  } else {
    this.delete(call.channel_id);
  }

  return true;
}

class CallCollection extends BaseCollection {
  constructor(discordie, gateway) {
    super();

    if (typeof gateway !== "function")
      throw new Error("Gateway parameter must be a function");

    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      if (e.socket != gateway()) return;

      Utils.bindGatewayEventHandlers(this, e, {
        READY: handleConnectionOpen,
        CALL_CREATE: handleCallCreate,
        CALL_UPDATE: handleCallUpdate,
        CALL_DELETE: handleCallDelete
      });
    });

    this._discordie = discordie;
    Utils.privatify(this);
  }
  isActive(channelId, messageId) {
    const call = this.get(channelId);
    if (messageId) {
      return call && !call.unavailable && call.message_id == messageId;
    }
    return call && !call.unavailable;
  }
  isUnavailable(channelId) {
    const call = this.get(channelId);
    return call && call.unavailable;
  }
}

module.exports = CallCollection;

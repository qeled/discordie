"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Utils = require("../../../core/Utils");

module.exports = function handler(data, gw) {
  const prev = data._prev; delete data._prev;
  const next = data._next; delete data._next;

  if (!gw.isPrimary) return true;

  if (!this.Dispatcher.hasListeners(Events.CHANNEL_UPDATE)) return true;

  this.Dispatcher.emit(Events.CHANNEL_UPDATE, {
    socket: gw,
    channel: this.Channels.get(data.id) ||
             this.DirectMessageChannels.get(data.id),
    getChanges: () => ({
      before: Utils.modelToObject(prev),
      after: Utils.modelToObject(next)
    })
  });
  return true;
};

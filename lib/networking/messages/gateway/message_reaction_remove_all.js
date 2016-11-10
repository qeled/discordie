"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Utils = require("../../../core/Utils");

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  const cached = data._cached; delete data._cached;

  const message = this.Messages.get(data.message_id);
  const channel = this.Channels.get(data.channel_id) ||
                  this.DirectMessageChannels.get(data.channel_id);

  this.Dispatcher.emit(Events.MESSAGE_REACTION_REMOVE_ALL, {
    socket: gw,
    channel, message,
    data,
    getCachedData: () => Utils.modelToObject(cached || null)
  });
  return true;
};

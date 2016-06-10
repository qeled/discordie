"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;
  this.Dispatcher.emit(Events.MESSAGE_DELETE_BULK, {
    socket: gw,
    channelId: data.channel_id,
    messageIds: data.ids,
    messages: data.ids.map(id => this.Messages.get(id)).filter(e => e)
  });
  return true;
};

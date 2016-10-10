"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  const user = this.Users.get(data.user_id);
  const message = this.Messages.get(data.message_id);
  const channel = this.Channels.get(data.channel_id) ||
                  this.DirectMessageChannels.get(data.channel_id);

  this.Dispatcher.emit(Events.MESSAGE_REACTION_ADD, {
    socket: gw,
    user, channel, message,
    emoji: data.emoji,
    data
  });
  return true;
};

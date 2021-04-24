"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  const channel = this.Channels.get(data.channel_id) ||
                  this.DirectMessageChannels.get(data.channel_id)

  if (!data.guild_id) {
    if (!channel) {
      this.DirectMessageChannels.getOrOpen(data.author.id).then(() => {
        const message = this.Messages.get(data.id);
        if (!message) return true;

        this.Dispatcher.emit(Events.MESSAGE_CREATE, {
          socket: gw,
          message: message
        });
        return true;
      }) // fire message_create after creating DM channel for the first time if it doesn't exist since V8 does not fire create_channel
    }
  }

  const message = this.Messages.get(data.id);
  if (!message) return true;

  this.Dispatcher.emit(Events.MESSAGE_CREATE, {
    socket: gw,
    message: message
  });
  return true;
};

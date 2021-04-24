"use strict";

const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, gw) {
  if (!gw.isPrimary) return true;

  if (!this.Dispatcher.hasListeners(Events.INVITE_CREATE)) return true;

  const event = {
    socket: gw,
    guild: this.Guilds.get(data.guild_id),
    member: this.Users.getMember(data.guild_id, data.inviter.id),
    channel: this.Channels.get(data.channel_id) ||
      this.DirectMessageChannels.get(data.channel_id),
    invite: {
      uses: data.uses,
      temporary: data.temporary,
      max_uses: data.max_uses,
      max_age: data.max_age,
      created_at: data.created_at,
      code: data.code
    }
  };

  this.Dispatcher.emit(Events.INVITE_CREATE, event);
  return true;
};

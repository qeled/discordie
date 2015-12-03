"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");

const Message = require("../models/Message");

function updateMessages(channelId, messageId, msg) {
  const messages = this._messagesByChannel[channelId] || {};

  if (msg.nonce && messages[msg.nonce]) {
    messages[messageId] = messages[msg.nonce];
  } else {
    let edited = true;
    if (messages[messageId]) {
      edited = (messages[messageId].edited_timestamp != msg.edited_timestamp);
      msg = messages[messageId].merge(msg);
    }
    messages[messageId] = new Message(msg);

    if (edited) {
      const edits = this._messageEdits[messageId] || [];
      edits.push(messages[messageId]);
      // cache of 50 edits should be enough?
      // todo: add an option to change this?
      if (edits.length > 50) {
        edits.shift();
      }
      this._messageEdits[messageId] = edits;
    }
  }

  // todo: option to set message cache limits by time/count?

  this._messagesByChannel[channelId] = messages;
}

function handleMessageCreateOrUpdate(msg) {
  msg.deleted = false;
  updateMessages.call(this, msg.channel_id, msg.id, msg);
  return true;
}

function handleMessageDelete(msg) {
  msg.deleted = true;
  updateMessages.call(this, msg.channel_id, msg.id, msg);
  return true;
}

function handleConnectionOpen(data) {
  this._messagesByChannel = {};
  this._hasMoreByChannel = {};
  this._messageEdits = {};
}

function handleCleanup() {
  for (let channelId in this._messagesByChannel) {
    if (!this._messagesByChannel.hasOwnProperty(channelId)) continue;
    if (this._discordie._channels.get(channelId)) continue;
    delete this._messagesByChannel[channelId];
    delete this._hasMoreByChannel[channelId];
  }
}

function handleLoadedMoreMessages(e) {
  if (!e.messages.length) return;
  const channelId = e.messages[0].channel_id;
  if (!e.before && !e.after) {
    this._hasMoreByChannel[channelId] = (e.limit == e.messages.length);
  }
  e.messages.forEach((msg) => {
    updateMessages.call(this, msg.channel_id, msg.id, msg);
  });
}

class MessageCollection {
  constructor(discordie, gateway) {
    if (typeof gateway !== "function")
      throw new Error("Gateway parameter must be a function");

    discordie.Dispatcher.on(Events.GATEWAY_READY, e => {
      if (e.socket != gateway()) return;
      (handleConnectionOpen.bind(this))(e.data);
    });
    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      if (e.socket != gateway()) return;

      Utils.bindGatewayEventHandlers(this, e, {
        MESSAGE_CREATE: handleMessageCreateOrUpdate,
        MESSAGE_UPDATE: handleMessageCreateOrUpdate,
        MESSAGE_DELETE: handleMessageDelete,
        CHANNEL_DELETE: handleCleanup,
        GUILD_DELETE: handleCleanup
      });
    });

    discordie.Dispatcher.on(Events.LOADED_MORE_MESSAGES,
      handleLoadedMoreMessages.bind(this));

    this.purgeAllCache();

    this._discordie = discordie;
    Utils.privatify(this);
  }
  *getIterator() {
    for (let channelId in this._messagesByChannel) {
      if (!this._messagesByChannel.hasOwnProperty(channelId)) continue;
      if (!this._discordie._channels.get(channelId)) continue;
      const channelMessages = this._messagesByChannel[channelId];
      for (let messageId in channelMessages) {
        if (!channelMessages[messageId])
          continue;
        yield channelMessages[messageId];
      }
    }
  }
  get(messageId) {
    for (let channelId in this._messagesByChannel) {
      if (!this._messagesByChannel.hasOwnProperty(channelId)) continue;
      if (!this._discordie._channels.get(channelId)) continue;
      const channelMessages = this._messagesByChannel[channelId];
      if (!channelMessages[messageId])
        continue;
      return channelMessages[messageId];
    }
  }
  update(message) {
    handleMessageCreateOrUpdate.call(this, message);
  }
  getMessagesForChannel(channelId) {
    return this._messagesByChannel(channelId);
  }
  channelHasMore(channelId) {
    if (this._hasMoreByChannel[channelId] === undefined)
      return true;
    return this._hasMoreByChannel[channelId];
  }
  getEdits(messageId) {
    return this._messageEdits[messageId].slice().reverse();
  }
  purgeChannelCache(channelId) {
    delete this._hasMoreByChannel[channelId];
    delete this._messagesByChannel[channelId];
  }
  purgeEdits() {
    this._messageEdits = {};
  }
  purgeAllCache() {
    this._messagesByChannel = {};
    this._hasMoreByChannel = {};
    this._messageEdits = {};
  }
}

module.exports = MessageCollection;

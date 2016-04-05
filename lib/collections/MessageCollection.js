"use strict";

const Constants = require("../Constants");
const Events = Constants.Events;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");
const LimitedCache = require("../core/LimitedCache");

const Message = require("../models/Message");

function getOrCreateChannelCache(channelId) {
  return (
    this._messagesByChannel[channelId] =
      this._messagesByChannel[channelId] ||
      new LimitedCache(this._messageLimit)
  );
}

function updateMessages(channelId, messageId, msg) {
  const messages = getOrCreateChannelCache.call(this, channelId);

  if (msg.nonce && messages.has(msg.nonce)) {
    messages.rename(msg.nonce, messageId);
  }

  var edited = true;
  var message = null;
  if (messages.has(messageId)) {
    edited = !!msg.edited_timestamp;
    messages.set(messageId, message = messages.get(messageId).merge(msg));
  } else {
    messages.set(messageId, message = new Message(msg));
  }

  if (edited) {
    const edits = this._messageEdits[messageId] || [];
    this._messageEdits[messageId] = edits;

    var edit = (
      message.embeds && message.embeds.length ?
        message.merge({embeds: []}) :
        message
    );
    edits.push(edit);
    trimEdits.call(this, messageId);
  }
}

function trimEdits(messageId) {
  if (!messageId) {
    for (var id in this._messageEdits)
      if (id) trimEdits.call(this, id);
  }
  const edits = this._messageEdits[messageId];
  if (!edits) return;
  if (edits.length > this._editsLimit)
    edits.splice(0, edits.length - this._editsLimit);
}

function handleMessageCreate(msg) {
  msg.deleted = false;
  updateMessages.call(this, msg.channel_id, msg.id, msg);
  return true;
}

function handleMessageUpdate(msg) {
  msg.deleted = false;

  const channelCache = this._messagesByChannel[msg.channel_id];
  if (!channelCache || !channelCache.has(msg.id)) return true;

  updateMessages.call(this, msg.channel_id, msg.id, msg);
  return true;
}

function handleMessageDelete(msg) {
  msg.deleted = true;

  const channelCache = this._messagesByChannel[msg.channel_id];
  if (!channelCache || !channelCache.has(msg.id)) return true;

  updateMessages.call(this, msg.channel_id, msg.id, msg);
  return true;
}

function handleConnectionOpen(data) {
  this.purgeAllCache();
}

function handleCleanup() {
  for (let channelId in this._messagesByChannel) {
    if (!this._messagesByChannel.hasOwnProperty(channelId)) continue;
    if (this._discordie._channels.get(channelId)) continue;

    var messageIds = this._messagesByChannel[channelId]._keys;
    for (var i = 0, len = messageIds.length; i < len; i++)
      delete this._messageEdits[messageIds[i]];

    delete this._messagesByChannel[channelId];
    delete this._hasMoreByChannel[channelId];
  }
}

function handleLoadedMoreMessages(e) {
  var messagesLength = e.messages.length;
  if (!messagesLength) return;

  const channelId = e.messages[0].channel_id;
  if (!e.before && !e.after) {
    this._hasMoreByChannel[channelId] = (e.limit == messagesLength);
  }

  const messages = getOrCreateChannelCache.call(this, channelId);

  const limit = messages.limit;
  messages.setLimit(limit + messagesLength);

  var i = messagesLength;
  while (i--) {
    var msg = e.messages[i];
    updateMessages.call(this, msg.channel_id, msg.id, msg);
  }

  messages.setLimit(Math.max(messages.size + 500, limit));
  // increase channel cache limits
  // in case new messages arrive and invalidate old message references
}

class MessageCollection {
  constructor(discordie, gateway) {
    if (typeof gateway !== "function")
      throw new Error("Gateway parameter must be a function");

    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      if (e.socket != gateway()) return;

      Utils.bindGatewayEventHandlers(this, e, {
        READY: handleConnectionOpen,
        MESSAGE_CREATE: handleMessageCreate,
        MESSAGE_UPDATE: handleMessageUpdate,
        MESSAGE_DELETE: handleMessageDelete,
        CHANNEL_DELETE: handleCleanup,
        GUILD_DELETE: handleCleanup
      });
    });

    discordie.Dispatcher.on(Events.LOADED_MORE_MESSAGES,
      handleLoadedMoreMessages.bind(this));

    this.purgeAllCache();
    this._messageLimit = 1000;
    this._editsLimit = 50;

    this._discordie = discordie;
    Utils.privatify(this);
  }

  getChannelMessageLimit(channelId) {
    if (!this._discordie._channels.get(channelId)) return -1;
    if (!this._messagesByChannel.hasOwnProperty(channelId)) return -1;
    return this._messagesByChannel[channelId].limit;
  }
  setChannelMessageLimit(channelId, limit) {
    if (!limit) return false;
    if (!this._discordie._channels.get(channelId)) return false;
    const messages = getOrCreateChannelCache.call(this, channelId);
    messages.setLimit(limit);
    return true;
  }

  getMessageLimit() { return this._messageLimit; }
  setMessageLimit(limit) {
    if (!limit) return;
    if (!(limit > 0)) limit = 1;
    var keys = Object.keys(this._messagesByChannel);
    for (var i = 0, len = keys.length; i < len; i++) {
      var cache = this._messagesByChannel[keys[i]];
      // decrease only for channels with default limit
      if (!cache) continue;
      if (cache.limit != this._messageLimit && limit < cache.limit)
        continue;
      var removed = cache.setLimit(limit);
      if (!removed) continue;
      for (var messageId of removed)
        delete this._messageEdits[messageId];
    }
    this._messageLimit = limit;
  }

  getEditsLimit() { return this._editsLimit; }
  setEditsLimit(limit) {
    if (!limit) return;
    if (!(limit > 0)) limit = 1;
    this._editsLimit = limit;
    trimEdits.call(this);
  }

  *getIterator() {
    for (var channelId in this._messagesByChannel) {
      if (!this._messagesByChannel.hasOwnProperty(channelId)) continue;
      if (!this._discordie._channels.get(channelId)) continue;
      var channelMessages = this._messagesByChannel[channelId];
      var keys = channelMessages._keys;
      for (var i = 0, len = keys.length; i < len; i++) {
        var message = channelMessages.get(keys[i]);
        if (message) yield message;
      }
    }
  }
  get(messageId) {
    for (var channelId in this._messagesByChannel) {
      if (!this._messagesByChannel.hasOwnProperty(channelId)) continue;
      if (!this._discordie._channels.get(channelId)) continue;
      var channelMessages = this._messagesByChannel[channelId];
      var message = channelMessages.get(messageId);
      if (message) return message;
    }
  }
  getChannelCache(channelId) {
    if (!this._discordie._channels.get(channelId)) return null;
    if (!this._messagesByChannel.hasOwnProperty(channelId)) return null;
    return this._messagesByChannel[channelId];
  }
  update(message) {
    handleMessageCreate.call(this, message);
  }
  channelHasMore(channelId) {
    if (this._hasMoreByChannel[channelId] === undefined)
      return true;
    return this._hasMoreByChannel[channelId];
  }
  getEdits(messageId) {
    var edits = this._messageEdits[messageId];
    return edits ? edits.slice().reverse() : [];
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

"use strict";

const Utils = require("../../core/Utils");
const RequestQueue = require("./RequestQueue");

class RequestQueueGroup {
  constructor() {
    this.queues = {};
  }
  get(id) {
    if (!this.queues[id]) this.queues[id] = new RequestQueue();
    this.queues[id].id = id;
    return this.queues[id];
  }
  delete(id) {
    delete this.queues[id];
  }
}

class RequestQueueManager {
  constructor(discordie) {
    this._discordie = discordie;

    this.isBot = true;

    this.disabled = false;

    // msg 10/10s
    this.userMessageQueue = new RequestQueue();

    // bot:msg:dm 5/5s
    this.botDirectMessageQueue = new RequestQueue();

    // per-guild bot:msg:server 5/5s + bot:msg 50/10s
    this.botMessageQueues = new RequestQueueGroup();

    // per-guild dmsg 5/1s
    this.messageDeleteQueues = new RequestQueueGroup();

    // per-guild bdmsg 1/1s
    this.messageBulkDeleteQueues = new RequestQueueGroup();

    // per-guild guild_member 10/10s, guild_member_nick 1/1s
    this.guildMemberPatchQueues = new RequestQueueGroup();

    discordie.Dispatcher.on("GATEWAY_DISPATCH", e => {
      if (!e.data) return;

      if (e.type === "READY") {
        if (!e.data.user) return;
        this.isBot = e.data.user.bot || false;
      }
      if (e.type === "GUILD_DELETE") {
        this._deleteGuildQueues(e.data.id);
      }
    });

    Utils.privatify(this);
  }

  putMessage(request, channelId, sendCallback) {
    const channel = this._discordie._channels.get(channelId);

    var queue = this.userMessageQueue;

    if (this.isBot && channel) {
      if (channel.is_private || !channel.guild_id) {
        queue = this.botDirectMessageQueue;
      } else {
        queue = this.botMessageQueues.get(channel.guild_id);
      }
    }

    this._enqueueTo(queue, request, sendCallback);
  }

  putDeleteMessage(request, channelId, sendCallback) {
    const group = this.messageDeleteQueues;
    this._enqueueToGroup(group, request, channelId, sendCallback);
  }
  putBulkDeleteMessage(request, channelId, sendCallback) {
    const group = this.messageBulkDeleteQueues;
    this._enqueueToGroup(group, request, channelId, sendCallback);
  }

  putGuildMemberPatch(request, guildId, sendCallback) {
    const queue = this.guildMemberPatchQueues.get(guildId);
    this._enqueueTo(queue, request, sendCallback);
  }

  _enqueueToGroup(group, request, channelId, sendCallback) {
    const channel = this._discordie._channels.get(channelId);
    const guildId = (channel && channel.guild_id) || null;

    this._enqueueTo(group.get(guildId), request, sendCallback);
  }
  _enqueueTo(queue, request, sendCallback) {
    if (this.disabled) {
      return request.send(sendCallback);
    }
    queue.enqueue(request, sendCallback);
  }
  _deleteGuildQueues(guildId) {
    const groups = [
      this.botMessageQueues,
      this.messageDeleteQueues,
      this.messageBulkDeleteQueues,
      this.guildMemberPatchQueues
    ];
    groups.forEach(g => g.delete(guildId));
  }
}

module.exports = RequestQueueManager;
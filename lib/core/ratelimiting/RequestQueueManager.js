"use strict";

const Utils = require("../../core/Utils");
const RequestQueue = require("./RequestQueue");

const ChainedBucket = require("./ChainedBucket");

class RequestQueueGroup {
  constructor(bucketFactory) {
    this.queues = {};
    this.bucketFactory = bucketFactory || null;

    if (!(bucketFactory instanceof BucketFactory)) {
      throw new TypeError(
        "Param 'bucketFactory' is not an instance of BucketFactory"
      );
    }
  }
  get(id) {
    if (!this.queues[id]) {
      const bucket = (this.bucketFactory && this.bucketFactory.get(id));
      this.queues[id] = new RequestQueue(bucket);
    }
    this.queues[id].id = id;
    return this.queues[id];
  }
  delete(id) {
    if (this.bucketFactory)
      this.bucketFactory.delete(id);
    delete this.queues[id];
  }
}

class BucketFactory {
  constructor(manager, size, duration, name, parent) {
    this.manager = manager;
    this.size = size;
    this.duration = duration;
    this.name = name;
    this.parent = parent || null;

    if (!(manager instanceof RequestQueueManager))
      throw new TypeError("Param 'manager' is invalid");
    if (typeof size !== "number")
      throw new TypeError("Param 'size' is not a number");
    if (typeof duration !== "number")
      throw new TypeError("Param 'duration' is not a number");
    if (typeof name !== "string")
      throw new TypeError("Param 'name' is not a string");
  }
  makeName(id) {
    return this.name + ":" + id;
  }
  get(id) {
    const parent =
      this.parent instanceof BucketFactory ?
        this.parent.get(id) :
        this.parent;
    return this.manager._createBucket(
      this.size, this.duration, this.makeName(id), parent
    );
  }
  delete(id) {
    delete this.manager.buckets[this.makeName(id)];
  }
}

class RequestQueueManager {
  constructor(discordie) {
    this._discordie = discordie;

    this.isBot = true;

    this.disabled = false;

    this.buckets = {};
    this.bucketFactories = {};

    // msg 10/10s
    const _msg =
      this._createBucket(10, 10000, "msg");
    this.userMessageQueue = new RequestQueue(_msg);

    // bot:msg:dm 5/5s
    const _bot_msg_dm =
      this._createBucket(5, 5000, "bot:msg:dm");
    this.botDirectMessageQueue = new RequestQueue(_bot_msg_dm);

    // per-guild bot:msg:server 5/5s + bot:msg 50/10s
    const _bot_msg =
      this._createBucket(50, 10000, "bot:msg");
    const _bot_msg_server =
      this._createBucketFactory(5, 5000, "bot:msg:server", _bot_msg);
    this.botMessageQueues = new RequestQueueGroup(_bot_msg_server);

    // per-guild dmsg 5/1s
    const _dmsg =
      this._createBucketFactory(5, 1000, "dmsg");
    this.messageDeleteQueues = new RequestQueueGroup(_dmsg);

    // per-guild bdmsg 1/1s
    const _bdmsg =
      this._createBucketFactory(1, 1000, "bdmsg");
    this.messageBulkDeleteQueues = new RequestQueueGroup(_bdmsg);

    // per-guild guild_member 10/10s
    const _guild_member =
      this._createBucketFactory(10, 10000, "guild_member");
    this.guildMemberPatchQueues = new RequestQueueGroup(_guild_member);

    // per-guild guild_member_nick 1/1s
    const _guild_member_nick =
      this._createBucketFactory(1, 1000, "guild_member_nick");
    this.guildMemberNickQueues = new RequestQueueGroup(_guild_member_nick);

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

  _reset() {
    Object.keys(this.buckets).forEach(k => this.buckets[k].refill());
  }

  _createBucket(size, duration, name, parent) {
    if (!this.buckets[name]) {
      this.buckets[name] = new ChainedBucket(size, duration, name, parent);
    } else {
      this.buckets[name].refill();
    }
    return this.buckets[name];
  }

  _createBucketFactory(size, duration, name, parent) {
    if (!this.bucketFactories[name]) {
      this.bucketFactories[name] =
        new BucketFactory(this, size, duration, name, parent);
    }
    return this.bucketFactories[name];
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
  putGuildMemberNick(request, guildId, sendCallback) {
    const queue = this.guildMemberNickQueues.get(guildId);
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
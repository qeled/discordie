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
  deleteContaining(id) {
    var keys = Object.keys(this.queues);
    for (var i = 0, len = keys.length; i < len; i++) {
      var key = keys[i];
      if (!key || key.indexOf(id) < 0) continue;
      this.delete(key);
    }
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

    // whole API, bucket blocks when client gets a HTTP 429 with global flag
    const _bot_global =
      this._createBucket(Infinity, 1000, "bot:global");

    this.globalBucket = _bot_global;

    // msg 10/10s
    const _msg =
      this._createBucket(10, 10000, "msg", _bot_global);
    this.userMessageQueue = new RequestQueue(_msg);

    // per-channel bot:msg:dm 10/10s
    const _bot_msg_dm =
      this._createBucketFactory(10, 10000, "bot:msg:dm", _bot_global);
    this.botDirectMessageQueues = new RequestQueueGroup(_bot_msg_dm);

    // per-guild bot:msg:server 10/10s
    const _bot_msg_server =
      this._createBucketFactory(10, 10000, "bot:msg:server", _bot_global);
    this.botMessageQueues = new RequestQueueGroup(_bot_msg_server);

    // per-guild dmsg 5/1s
    const _dmsg =
      this._createBucketFactory(5, 1000, "dmsg", _bot_global);
    this.messageDeleteQueues = new RequestQueueGroup(_dmsg);

    // per-guild bdmsg 1/1s
    const _bdmsg =
      this._createBucketFactory(1, 1000, "bdmsg", _bot_global);
    this.messageBulkDeleteQueues = new RequestQueueGroup(_bdmsg);

    // per-guild guild_member 10/10s
    const _guild_member =
      this._createBucketFactory(10, 10000, "guild_member", _bot_global);
    this.guildMemberPatchQueues = new RequestQueueGroup(_guild_member);

    // per-guild guild_member_nick 1/1s
    const _guild_member_nick =
      this._createBucketFactory(1, 1000, "guild_member_nick", _bot_global);
    this.guildMemberNickQueues = new RequestQueueGroup(_guild_member_nick);

    // all other requests go here with route as key
    // bucket size should be set by HTTP headers
    const _bot_generic =
      this._createBucketFactory(Infinity, 5000, "bot:generic", _bot_global);
    this.genericRequestQueues = new RequestQueueGroup(_bot_generic);

    discordie.Dispatcher.on("GATEWAY_DISPATCH", e => {
      if (!e.data) return;

      if (e.type === "READY") {
        if (!e.data.user) return;
        this.isBot = e.data.user.bot || false;
      }
      if (e.type === "GUILD_DELETE") {
        this._deleteGuildQueues(e.data.id);
      }
      if (e.type === "CHANNEL_DELETE") {
        this._deleteChannelQueues(e.data.id);
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

  put(request, sendCallback) {
    const path = request.path
      .replace(/\/\d+$/g, "")
      .replace(/\d+/g, ":id");

    const route = `${request.method}!${path}`;

    // convert to route: <- /api/guilds/:guild_id/bans/:user_id
    //                   -> get!/api/guilds/:id/bans
    //                   <- /api/channels/:channel_id
    //                   -> patch!/api/channels/

    const queue = this.genericRequestQueues.get(route);
    this._enqueueTo(queue, request, sendCallback);
  }

  putToRoute(request, route, sendCallback) {
    const queue = this.genericRequestQueues.get(route);
    this._enqueueTo(queue, request, sendCallback);
  }

  putMessage(request, channelId, sendCallback) {
    const channel = this._discordie._channels.get(channelId);

    var queue = this.userMessageQueue;

    if (this.isBot && channel) {
      if (channel.is_private || !channel.guild_id) {
        queue = this.botDirectMessageQueues.get(channelId);
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

    this.genericRequestQueues.deleteContaining(guildId);
  }
  _deleteChannelQueues(channelId) {
    this.botDirectMessageQueues.delete(channelId);

    this.genericRequestQueues.deleteContaining(channelId);
  }
}

module.exports = RequestQueueManager;
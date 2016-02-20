"use strict";

const Constants = require("../Constants");
const StatusTypes = Constants.StatusTypes;
const Events = Constants.Events;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");

const User = require("../models/User");
const AuthenticatedUser = require("../models/AuthenticatedUser");

function getUserStates(userId) {
  var states = [];
  for (var userMap of this._usersForChannel.values()) {
    for (var id of userMap.keys()) {
      if (id != userId) continue;
      states.push(userMap.get(id));
    }
  }
  return states;
}
function createChangeEvent(state, e) {
  return {
    socket: e.socket,
    user: this._discordie.Users.get(state.user_id),
    channel:
      this._discordie.Channels.get(state.channel_id) ||
      this._discordie.DirectMessageChannels.get(state.channel_id),
    channelId: state.channel_id,
    guildId: state.guild_id
  };
}
function emitMuteDeafUpdate(type, state, key, e) {
  var e = createChangeEvent.call(this, state, e);
  e.state = state[key];
  this._discordie.Dispatcher.emit(type, e);
}
function emitChanges(before, after, e) {
  if (!before.length && !after.length) return;
  var leave =
    before.filter(b => !after.find(a => a.channel_id == b.channel_id));
  var join =
    after.filter(a => !before.find(b => a.channel_id == b.channel_id));

  var moved = leave.length === 1 && join.length === 1;

  leave.forEach(state => {
    var event = createChangeEvent.call(this, state, e);
    event.newChannelId = moved ? join[0].channel_id : null;
    event.newGuildId = moved ? join[0].guild_id : null;

    this._discordie.Dispatcher.emit(
      Events.VOICE_CHANNEL_LEAVE,
      event
    );
  });
  join.forEach(state => {
    this._discordie.Dispatcher.emit(
      Events.VOICE_CHANNEL_JOIN,
      createChangeEvent.call(this, state, e)
    );
  });

  if (!leave.length && !join.length) {
    var sm = after.find(b => before.find(a => a.self_mute != b.self_mute));
    var sd = after.find(b => before.find(a => a.self_deaf != b.self_deaf));
    var m = after.find(b => before.find(a => a.mute != b.mute));
    var d = after.find(b => before.find(a => a.deaf != b.deaf));

    var _emitMuteDeafUpdate = emitMuteDeafUpdate.bind(this);
    if (sm)_emitMuteDeafUpdate(Events.VOICE_USER_SELF_MUTE, sm, "self_mute", e);
    if (sd)_emitMuteDeafUpdate(Events.VOICE_USER_SELF_DEAF, sd, "self_deaf", e);
    if (m) _emitMuteDeafUpdate(Events.VOICE_USER_MUTE, m, "mute", e);
    if (d) _emitMuteDeafUpdate(Events.VOICE_USER_DEAF, d, "deaf", e);
  }
}


function getOrCreate(type, target, key) {
  const _T = target.get(key);
  const got = _T || new type();
  if (!_T) target.set(key, got);
  return got;
}

function speakingDelete(userId, guildId) {
  if (guildId) {
    const info = this._discordie.VoiceConnections.getForGuild(guildId);
    if (!info) return;
    const speakingSet = this._speakingForVC.get(info.voiceConnection);
    if (speakingSet) speakingSet.delete(userId);
    return;
  }

  for (const speakingSet of this._speakingForVC.values()) {
    speakingSet.delete(userId);
  }
}

function ssrcDelete(userId, guildId) {
  function removeFromMap(ssrcMap) {
    for (const pair of ssrcMap.entries()) {
      const ssrc = pair[0];
      const user = pair[1];
      if (user == userId)
        ssrcMap.delete(ssrc);
    }
  }

  if (guildId) {
    const info = this._discordie.VoiceConnections.getForGuild(guildId);
    if (!info) return;
    const ssrcMap = this._ssrcForVC.get(info.voiceConnection);
    if (ssrcMap) removeFromMap(ssrcMap);
    return;
  }

  for (const ssrcMap of this._ssrcForVC.values()) {
    removeFromMap(ssrcMap);
  }
}

function userDelete(userId, guildId) {
  if (guildId) {
    const channels = this._discordie._channels.getGuildChannelIterator();
    for (const channel of channels) {
      if (channel.guild_id != guildId) continue;
      const userMap = this._usersForChannel.get(channel.id);
      if (userMap) userMap.delete(userId);
    }
    return;
  }

  for (const userMap of this._usersForChannel.values()) {
    userMap.delete(userId);
  }
}

function initializeCache() {
  this._speakingForVC = new Map();
  this._ssrcForVC = new Map();
  this._usersForChannel = new Map();
}

function handleConnectionOpen(data) {
  initializeCache.call(this);
  data.guilds.forEach(guild => {
    if (guild.unavailable) return;
    guild.voice_states.forEach(handleVoiceStateUpdate.bind(this));
  });
  return true;
}

function handleVoiceStateUpdateChanges(data, e) {
  var before = getUserStates.call(this, data.user_id);

  handleVoiceStateUpdate.call(this, data);

  var after = getUserStates.call(this, data.user_id);
  process.nextTick(() => emitChanges.call(this, before, after, e));
  return true;
}

function handleVoiceStateUpdate(data) {
  userDelete.call(this, data.user_id, data.guild_id);
  if (!data.channel_id) {
    speakingDelete.call(this, data.user_id, data.guild_id);
    ssrcDelete.call(this, data.user_id, data.guild_id);
    return true;
  }
  getOrCreate(Map, this._usersForChannel, data.channel_id)
    .set(data.user_id, data);
  return true;
}

function handleVoiceSpeaking(data, voiceSocket) {
  const info = this._discordie.VoiceConnections.getForVoiceSocket(voiceSocket);
  if (!info) return true;
  const vc = info.voiceConnection;

  const speakingSet = getOrCreate(Set, this._speakingForVC, vc);
  data.speaking ?
    speakingSet.add(data.user_id) :
    speakingSet.delete(data.user_id);

  getOrCreate(Map, this._ssrcForVC, vc)
    .set(data.ssrc, data.user_id);

  return true;
}

function handlePresenceUpdate(presence) {
  if (presence.status != StatusTypes.OFFLINE) return true;

  const userId = presence.user.id;

  speakingDelete.call(this, userId);
  ssrcDelete.call(this, userId);
  userDelete.call(this, userId);

  return true;
}

function handleDeleteChannel(channel, e) {
  // just silently delete voice states as clients still stay connected to
  // deleted channels

  //var userMap = this._usersForChannel.get(channel.id);
  //for (var userId of userMap.keys()) {
  //  var event = createChangeEvent.call(this, {
  //    user_id: userId,
  //    channel_id: channel.id,
  //    guild_id: channel.guild_id
  //  }, e);
  //  event.newChannelId = event.newGuildId = null;
  //
  //  this._discordie.Dispatcher.emit(Events.VOICE_CHANNEL_LEAVE, event);
  //}

  this._usersForChannel.delete(channel.id);
  return true;
}

class VoiceStateCollection {
  constructor(discordie, gateway) {
    if (typeof gateway !== "function")
      throw new Error("Gateway parameter must be a function");

    discordie.Dispatcher.on(Events.GATEWAY_READY, e => {
      if (e.socket != gateway()) return;
      (handleConnectionOpen.bind(this))(e.data);
    });
    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      // listens to messages from all gateways
      Utils.bindGatewayEventHandlers(this, e, {
        CHANNEL_DELETE: handleDeleteChannel,
        VOICE_STATE_UPDATE: handleVoiceStateUpdateChanges,
      });

      if (e.socket != gateway()) return;

      // listens to messages from primary gateway only
      Utils.bindGatewayEventHandlers(this, e, {
        PRESENCE_UPDATE: handlePresenceUpdate
      });
    });
    discordie.Dispatcher.on(Events.VOICE_SPEAKING, e => {
      if (handleVoiceSpeaking.call(this, e.data, e.socket))
        e.handled = true;

      if (e.data.user_id) {
        const user = this._discordie.Users.get(e.data.user_id);
        if (user) e.user = user;

        const info = discordie.VoiceConnections.getForVoiceSocket(e.socket);
        if (info) e.voiceConnection = info.voiceConnection;
      }
    });
    discordie.Dispatcher.on(Events.VOICE_DISCONNECTED, e => {
      this._speakingForVC.delete(e.voiceConnection);
      this._ssrcForVC.delete(e.voiceConnection);
    });

    initializeCache.call(this);

    this._discordie = discordie;
    Utils.privatify(this);
  }
  getStatesInChannel(channelId) {
    channelId = channelId.valueOf();
    const userMap = this._usersForChannel.get(channelId);
    if (!userMap) return new Map();
    return userMap;
  }
  getUserStateInGuild(guildId, userId) {
    // note: there can be more than 1 voice member with same user id in guild
    // this will return only the first voice state registered
    const channels = this._discordie._channels.getGuildChannelIterator();
    for (var channel of channels) {
      if (channel.guild_id != guildId) continue;

      const userMap = this._usersForChannel.get(channel.id);
      if (!userMap) continue;

      for (var id of userMap.keys()) {
        if (id != userId) continue;
        return userMap.get(id);
      }
    }
    return null;
  }
  ssrcToUserId(voiceConnection, ssrc) {
    const ssrcMap = this._ssrcForVC.get(voiceConnection);
    if (ssrcMap) return ssrcMap.get(ssrc) || null;
    return null;
  }
}

module.exports = VoiceStateCollection;

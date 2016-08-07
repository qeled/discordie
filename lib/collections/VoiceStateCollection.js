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
  var channels = this._channelsForUser.get(userId);
  if (!channels) return states;
  Array.from(channels).forEach(channelId => {
    var userMap = this._usersForChannel.get(channelId);
    if (!userMap || !userMap.has(userId)) return;
    states.push(userMap.get(userId));
  });
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
function shouldCalculateChanges() {
  var Dispatcher = this._discordie.Dispatcher;
  return Dispatcher.hasListeners(Events.VOICE_CHANNEL_JOIN) ||
         Dispatcher.hasListeners(Events.VOICE_CHANNEL_LEAVE) ||
         Dispatcher.hasListeners(Events.VOICE_USER_SELF_MUTE) ||
         Dispatcher.hasListeners(Events.VOICE_USER_SELF_DEAF) ||
         Dispatcher.hasListeners(Events.VOICE_USER_MUTE) ||
         Dispatcher.hasListeners(Events.VOICE_USER_DEAF);
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

  for (var speakingSet of this._speakingForVC.values()) {
    speakingSet.delete(userId);
  }
}

function ssrcDelete(userId, guildId) {
  function removeFromMap(ssrcMap) {
    for (var pair of ssrcMap.entries()) {
      var ssrc = pair[0];
      var user = pair[1];
      if (user == userId) ssrcMap.delete(ssrc);
    }
  }

  if (guildId) {
    const info = this._discordie.VoiceConnections.getForGuild(guildId);
    if (!info) return;
    const ssrcMap = this._ssrcForVC.get(info.voiceConnection);
    if (ssrcMap) removeFromMap(ssrcMap);
    return;
  }

  for (var ssrcMap of this._ssrcForVC.values()) {
    removeFromMap(ssrcMap);
  }
}

function userDelete(userId, guildId) {
  var channels = this._channelsForUser.get(userId);
  if (!channels) return;

  for (var channelId of channels.values()) {
    var userMap = this._usersForChannel.get(channelId);
    if (!userMap) continue;

    if (guildId) {
      var state = userMap.get(userId);
      if (state.guild_id && state.guild_id !== guildId) continue;
    }

    userMap.delete(userId);
    channels.delete(channelId);

    if (!userMap.size) this._usersForChannel.delete(channelId);
    if (!channels.size) this._channelsForUser.delete(userId);
  }
}
function channelDelete(channelId) {
  var userMap = this._usersForChannel.get(channelId);
  this._usersForChannel.delete(channelId);
  if (!userMap) return;

  for (var state of userMap.values()) {
    var channels = this._channelsForUser.get(state.user_id);
    channels.delete(state.channel_id);

    if (!channels.size) this._channelsForUser.delete(state.user_id);
  }
}

function initializeCache() {
  this._speakingForVC = new Map();   // Map<IVoiceConnection, Map<userId, bool>>
  this._ssrcForVC = new Map();       // Map<IVoiceConnection, Map<userId, ssrc>>
  this._usersForChannel = new Map(); // Map<channelId, Map<userId, voiceState>>
  this._channelsForUser = new Map(); // Map<userId, Set<channelId>>
}

function handleConnectionOpen(data) {
  initializeCache.call(this);
  data.guilds.forEach(guild => handleGuildCreate.call(this, guild));
  return true;
}

function handleGuildCreate(guild) {
  if (guild.unavailable) return;
  guild.voice_states.forEach(state => {
    // states in READY don't contain `guild_id`
    state.guild_id = guild.id;
    insertVoiceState.call(this, state);
  });
}

function handleVoiceStateUpdateChanges(data, e) {
  // process only if we have event listeners for those events
  if (!shouldCalculateChanges.call(this)) {
    handleVoiceStateUpdate.call(this, data);
    return true;
  }

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
  insertVoiceState.call(this, data);
  return true;
}

function insertVoiceState(data) {
  getOrCreate(Map, this._usersForChannel, data.channel_id)
    .set(data.user_id, data);
  getOrCreate(Set, this._channelsForUser, data.user_id)
    .add(data.channel_id);
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

function handleChannelDelete(channel, e) {
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

  channelDelete.call(this, channel.id);
  return true;
}

function handleGuildDelete(guild) {
  handleCleanup.call(this);
  return true;
}

function handleCleanup() {
  for (var channelId of this._usersForChannel.keys()) {
    // delete all channel states if channel is no longer in cache
    if (!this._discordie._channels.get(channelId))
      channelDelete.call(this, channelId);
  }
}

function handleCallCreate(call) {
  if (!call || !call.voice_states) return true;
  call.voice_states.forEach(state => {
    state.guild_id = null;
    insertVoiceState.call(this, state);
  })
}

function handleCallDelete(call) {
  if (!call || !call.channel_id) return true;
  channelDelete.call(this, call.channel_id);
}

class VoiceStateCollection {
  constructor(discordie, gateway) {
    if (typeof gateway !== "function")
      throw new Error("Gateway parameter must be a function");

    discordie.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
      if (e.socket != gateway()) return;

      Utils.bindGatewayEventHandlers(this, e, {
        READY: handleConnectionOpen,
        GUILD_CREATE: handleGuildCreate,
        GUILD_DELETE: handleGuildDelete,
        CHANNEL_DELETE: handleChannelDelete,
        VOICE_STATE_UPDATE: handleVoiceStateUpdateChanges,
        PRESENCE_UPDATE: handlePresenceUpdate,
        CALL_CREATE: handleCallCreate,
        CALL_DELETE: handleCallDelete
      });
    });
    discordie.Dispatcher.on(Events.VOICE_SPEAKING, e => {
      if (handleVoiceSpeaking.call(this, e.data, e.socket))
        e.handled = true;

      if (e.data && e.data.user_id) {
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
    var channels = this._channelsForUser.get(userId);
    if (!channels) return null;

    for (var channelId of channels.values()) {
      const userMap = this._usersForChannel.get(channelId);
      if (!userMap) continue;

      var state = userMap.get(userId);
      if (!state) continue;

      if (state.guild_id == guildId) return state;
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

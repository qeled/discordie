"use strict";

const Constants = require("../Constants");
const StatusTypes = Constants.StatusTypes;
const Events = Constants.Events;
const Utils = require("../core/Utils");
const BaseCollection = require("./BaseCollection");

const User = require("../models/User");
const AuthenticatedUser = require("../models/AuthenticatedUser");

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
    const channels = this._discordie._channels.getGuildChannelIterator(guildId);
    for (const channel of channels)
      if (channel.guild_id == guildId) {
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
        VOICE_STATE_UPDATE: handleVoiceStateUpdate,
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
  ssrcToUserId(voiceConnection, ssrc) {
    const ssrcMap = this._ssrcForVC.get(voiceConnection);
    if (ssrcMap) return ssrcMap.get(ssrc) || null;
    return null;
  }
}

module.exports = VoiceStateCollection;

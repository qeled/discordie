"use strict";

const Permissions = {
  General: {
    CREATE_INSTANT_INVITE: 1 << 0,
    KICK_MEMBERS: 1 << 1,
    BAN_MEMBERS: 1 << 2,
    MANAGE_ROLES: 1 << 3,
    MANAGE_CHANNELS: 1 << 4,
    MANAGE_GUILD: 1 << 5,
  },
  Text: {
    READ_MESSAGES: 1 << 10,
    SEND_MESSAGES: 1 << 11,
    SEND_TTS_MESSAGES: 1 << 12,
    MANAGE_MESSAGES: 1 << 13,
    EMBED_LINKS: 1 << 14,
    ATTACH_FILES: 1 << 15,
    READ_MESSAGE_HISTORY: 1 << 16,
    MENTION_EVERYONE: 1 << 17,
  },
  Voice: {
    CONNECT: 1 << 20,
    SPEAK: 1 << 21,
    MUTE_MEMBERS: 1 << 22,
    DEAFEN_MEMBERS: 1 << 23,
    MOVE_MEMBERS: 1 << 24,
    USE_VAD: 1 << 25,
  }
};

const ChannelGeneral = {
  CREATE_INSTANT_INVITE: Permissions.General.CREATE_INSTANT_INVITE,
  MANAGE_CHANNEL: Permissions.General.MANAGE_CHANNELS,
  MANAGE_PERMISSIONS: Permissions.General.MANAGE_ROLES
};
const PermissionSpecs = {
  Role: Permissions,
  TextChannel: {
    General: ChannelGeneral,
    Text: Permissions.Text
  },
  VoiceChannel: {
    General: ChannelGeneral,
    Voice: Permissions.Voice
  }
};
const PermissionsDefault = [
  Permissions.General.CREATE_INSTANT_INVITE,
  Permissions.Text.READ_MESSAGES,
  Permissions.Text.SEND_MESSAGES,
  Permissions.Text.SEND_TTS_MESSAGES,
  Permissions.Text.EMBED_LINKS,
  Permissions.Text.ATTACH_FILES,
  Permissions.Text.READ_MESSAGE_HISTORY,
  Permissions.Text.MENTION_EVERYONE,
  Permissions.Voice.CONNECT,
  Permissions.Voice.SPEAK,
  Permissions.Voice.USE_VAD
].reduce((ps, p) => ps | p, 0);

const Constants = {
  ReadyState: {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  },
  DiscordieState: {
    DISCONNECTED: 0,
    LOGGING_IN: 0,
    LOGGED_IN: 0,
    CONNECTING: 0,
    CONNECTED: 0,
  },
  Events: {
    // base
    CONNECTED: 0,
    DISCONNECTED: 0,

    GATEWAY_OPEN: 0,
    GATEWAY_DISPATCH: 0,
    GATEWAY_DISCONNECT: 0,
    GATEWAY_UNHANDLED_MESSAGE: 0,

    VOICESOCKET_OPEN: 0,
    VOICESOCKET_DISCONNECT: 0,
    // todo: handle "connected from another location" in VoiceSocket
    VOICESOCKET_UNHANDLED_MESSAGE: 0,

    VOICE_READY: 0,
    VOICE_SESSION_DESCRIPTION: 0,
    VOICE_SPEAKING: 0,

    // rest
    REQUEST_AUTH_LOGIN_ERROR: 0, REQUEST_AUTH_LOGIN_SUCCESS: 0,
    REQUEST_GATEWAY_ERROR: 0, REQUEST_GATEWAY_SUCCESS: 0,

    // custom
    GATEWAY_READY: 0,
    VOICE_CONNECTED: 0,
    GUILD_UNAVAILABLE: 0,
    MESSAGE_CREATE: 0,
    MESSAGE_UPDATE: 0,
    MESSAGE_DELETE: 0,
    LOADED_MORE_MESSAGES: 0,
    LOADED_GUILD_BANS: 0,
    PRESENCE_UPDATE: 0,
    // todo: add more proxy events like CHANNEL_CREATE and stuff?
  },
  ChannelTypes: {
    TEXT: "text",
    VOICE: "voice"
  },
  EncryptionModes: {
    plain: 0,
    xsalsa20_poly1305: 0,
  },

  Endpoints: {
    AVATAR: (userId, hash) => `/users/${userId}/avatars/${hash}.jpg`,
    GUILD_ICON: (guildId, hash) => `/guilds/${guildId}/icons/${hash}.jpg`,
    LOGIN: "/auth/login",
    ME: "/users/@me",
    TYPING: channelId => `/channels/${channelId}/typing`,
    CHANNEL_PERMISSIONS: channelId => `/channels/${channelId}/permissions`,
    MESSAGES: channelId => `/channels/${channelId}/messages`,
    CHANNELS: "/channels",
    SETTINGS: "/users/@me/settings",
    GUILD_CHANNELS: guildId => `/guilds/${guildId}/channels`,
    GUILDS: "/guilds",
    INSTANT_INVITES: channelId => `/channels/${channelId}/invites`,

    USER_CHANNELS: userId => `/users/${userId}/channels`,
    GUILD_MEMBERS: guildId => `/guilds/${guildId}/members`,
    GUILD_BANS: guildId => `/guilds/${guildId}/bans`,
    GUILD_ROLES: guildId => `/guilds/${guildId}/roles`,
    GUILD_INSTANT_INVITES: guildId => `/guilds/${guildId}/invites`,
    GUILD_EMBED: guildId => `/guilds/${guildId}/embed`,
    GUILD_PRUNE: guildId => `/guilds/${guildId}/prune`,
    USERS: "/users",
    LOGOUT: "/auth/logout",
    REGISTER: "/auth/register",
    INVITE: "/invite",
    REGIONS: "/voice/regions",
    ICE: "/voice/ice",
    GATEWAY: "/gateway"
  },
  API_ENDPOINT: "https://discordapp.com/api",

  Permissions: Permissions,
  PermissionsDefault: PermissionsDefault,
  PermissionSpecs: PermissionSpecs,

  StatusTypes: {
    ONLINE: "online",
    OFFLINE: "offline",
    IDLE: "idle"
  },
  TYPING_TIMEOUT: 10000,
};

function mirror(d) { Object.keys(d).forEach((k) => d[k] = k); }
function enumerate(d) { let c = 0; Object.keys(d).forEach((k) => d[k] = c++); }

mirror(Constants.Events);
mirror(Constants.EncryptionModes);
mirror(Constants.DiscordieState);

module.exports = Constants;

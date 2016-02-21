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
    // =============================== INTERNAL ===============================
    GATEWAY_OPEN: 0,
    GATEWAY_DISPATCH: 0,
    GATEWAY_DISCONNECT: 0,
    GATEWAY_UNHANDLED_MESSAGE: 0,

    VOICESOCKET_OPEN: 0,
    VOICESOCKET_DISCONNECT: 0,
    VOICESOCKET_UNHANDLED_MESSAGE: 0,

    VOICE_READY: 0,
    VOICE_SESSION_DESCRIPTION: 0,
    VOICE_SPEAKING: 0,

    LOADED_MORE_MESSAGES: 0,
    LOADED_GUILD_BANS: 0,

    ANY_GATEWAY_READY: 0, // fires on every gateway (primary and secondary)

    // ================================= REST =================================
    REQUEST_AUTH_LOGIN_ERROR: 0, REQUEST_AUTH_LOGIN_SUCCESS: 0,
    REQUEST_GATEWAY_ERROR: 0, REQUEST_GATEWAY_SUCCESS: 0,

    // ================================ CUSTOM ================================

    /**
     * Emitted when login or gateway auth failed,
     * or primary gateway socket disconnects, closing all open sockets.
     * @event DISCONNECTED
     * @property {Error} error
     */
    DISCONNECTED: 0,

    /**
     * @event GATEWAY_READY
     * @property {GatewaySocket} socket
     * @property {Object} data - Raw event data
     */
    GATEWAY_READY: 0, // fires only on primary gateway

    /**
     * Emitted when a new voice connections is fully initialized.
     * @event VOICE_CONNECTED
     * @property {VoiceSocket} socket
     * @property {IVoiceConnection} voiceConnection
     */
    VOICE_CONNECTED: 0,
    /**
     * Emitted when a voice socket disconnects.
     * @event VOICE_DISCONNECTED
     * @property {VoiceSocket} socket
     * @property {IVoiceConnection} voiceConnection
     */
    VOICE_DISCONNECTED: 0,

    /**
     * Emitted when guild becomes unavailable.
     * Guild will be deleted from cache until another `GUILD_CREATE`.
     * @event GUILD_UNAVAILABLE
     * @property {GatewaySocket} socket
     * @property {String} guildId
     */
    GUILD_UNAVAILABLE: 0,

    /**
     * Emitted when `username`, `avatar` or `discriminator` difference detected
     * in an incoming PRESENCE_UPDATE event.
     * @event PRESENCE_MEMBER_INFO_UPDATE
     * @property {GatewaySocket} socket
     * @property {Object} old - old instance of internal User model (immutable)
     * @property {Object} new - new instance of internal User model (immutable)
     */
    PRESENCE_MEMBER_INFO_UPDATE: 0,

    /**
     * Emitted when user leaves voice channel.
     * Fields `newChannelId`/`newGuildId` contain ids that will appear in
     * `VOICE_CHANNEL_JOIN` event that will follow if user has moved to
     * another channel, otherwise null.
     * @event VOICE_CHANNEL_LEAVE
     * @property {GatewaySocket} socket
     * @property {IUser} user
     * @property {IChannel|null} channel
     * @property {String} channelId
     * @property {String} guildId
     * @property {String|null} newChannelId -
     *                         next channel id if user moved to another channel
     * @property {String|null} newGuildId -
     *                         next guild id if user moved to another channel
     */
    VOICE_CHANNEL_LEAVE: 0,

    /**
     * Emitted when user joins voice channel.
     * @event VOICE_CHANNEL_JOIN
     * @property {GatewaySocket} socket
     * @property {IUser} user
     * @property {IChannel} channel
     * @property {String} channelId
     * @property {String} guildId
     */
    VOICE_CHANNEL_JOIN: 0,

    /**
     * Emitted when user self mute change is detected.
     * Manual client-side mute.
     * @event VOICE_USER_SELF_MUTE
     * @property {GatewaySocket} socket
     * @property {IUser} user
     * @property {IChannel} channel
     * @property {String} channelId
     * @property {String} guildId
     * @property {boolean} state - current state
     */
    VOICE_USER_SELF_MUTE: 0,

    /**
     * Emitted when user self deaf change is detected.
     * Manual client-side deafen.
     * @event VOICE_USER_SELF_DEAF
     * @property {GatewaySocket} socket
     * @property {IUser} user
     * @property {IChannel} channel
     * @property {String} channelId
     * @property {String} guildId
     * @property {boolean} state - current state
     */
    VOICE_USER_SELF_DEAF: 0,

    /**
     * Emitted when user mute change is detected.
     * Global server-side mute.
     * @event VOICE_USER_MUTE
     * @property {GatewaySocket} socket
     * @property {IUser} user
     * @property {IChannel} channel
     * @property {String} channelId
     * @property {String} guildId
     * @property {boolean} state - current state
     */
    VOICE_USER_MUTE: 0,

    /**
     * Emitted when user deaf change is detected.
     * Global server-side deafen.
     * @event VOICE_USER_DEAF
     * @property {GatewaySocket} socket
     * @property {IUser} user
     * @property {IChannel} channel
     * @property {String} channelId
     * @property {String} guildId
     * @property {boolean} state - current state
     */
    VOICE_USER_DEAF: 0,

    // ============================= PROXY EVENTS =============================
    /**
     * @event MESSAGE_CREATE
     * @property {GatewaySocket} socket
     * @property {IMessage} message
     */
    MESSAGE_CREATE: 0,
    /**
     * Emitted when user deletes their message.
     * Contains null `message` if not cached.
     * @event MESSAGE_DELETE
     * @property {GatewaySocket} socket
     * @property {String} channelId
     * @property {String} messageId
     * @property {IMessage|null} message
     */
    MESSAGE_DELETE: 0,
    /**
     * Emitted when user updates their message.
     * Contains null `message` if not cached.
     * @event MESSAGE_UPDATE
     * @property {GatewaySocket} socket
     * @property {IMessage|null} message
     * @property {Object} data - object received from server
     */
    MESSAGE_UPDATE: 0,

    /**
     * @event PRESENCE_UPDATE
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     * @property {IGuildMember} member
     */
    PRESENCE_UPDATE: 0,
    /**
     * @event TYPING_START
     * @property {GatewaySocket} socket
     * @property {IUser} user
     * @property {Number} timestamp - unix timestamp
     * @property {IChannel} channel
     */
    TYPING_START: 0,

    /**
     * @event CHANNEL_CREATE
     * @property {GatewaySocket} socket
     * @property {IChannel} channel
     */
    CHANNEL_CREATE: 0,
    /**
     * @event CHANNEL_DELETE
     * @property {GatewaySocket} socket
     * @property {String} channelId
     * @property {Object} data - channel info received from server
     */
    CHANNEL_DELETE: 0,
    /**
     * @event CHANNEL_UPDATE
     * @property {GatewaySocket} socket
     * @property {IChannel} channel
     */
    CHANNEL_UPDATE: 0,

    /**
     * @event GUILD_CREATE
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     */
    GUILD_CREATE: 0,
    /**
     * @event GUILD_DELETE
     * @property {GatewaySocket} socket
     * @property {String} guildId
     * @property {Object} data - guild info received from server
     */
    GUILD_DELETE: 0,
    /**
     * @event GUILD_UPDATE
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     */
    GUILD_UPDATE: 0,

    /**
     * @event GUILD_MEMBER_ADD
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     * @property {IGuildMember} member
     */
    GUILD_MEMBER_ADD: 0,
    /**
     * @event GUILD_MEMBER_REMOVE
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     * @property {IUser} user
     */
    GUILD_MEMBER_REMOVE: 0,
    /**
     * @event GUILD_MEMBER_UPDATE
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     * @property {IGuildMember} member
     */
    GUILD_MEMBER_UPDATE: 0,

    /**
     * @event GUILD_BAN_ADD
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     * @property {IUser} user
     */
    GUILD_BAN_ADD: 0,
    /**
     * @event GUILD_BAN_REMOVE
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     * @property {IUser} user
     */
    GUILD_BAN_REMOVE: 0,

    /**
     * @event GUILD_ROLE_CREATE
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     * @property {IRole} role
     */
    GUILD_ROLE_CREATE: 0,
    /**
     * @event GUILD_ROLE_UPDATE
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     * @property {IRole} role
     */
    GUILD_ROLE_UPDATE: 0,
    /**
     * @event GUILD_ROLE_DELETE
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     * @property {String} roleId
     */
    GUILD_ROLE_DELETE: 0,
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
    GUILD_REGIONS: guildId => `/guilds/${guildId}/regions`,
    GUILD_SPLASH: (guildId, hash) => `/guilds/${guildId}/splashes/${hash}.jpg`,
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

  VerificationLevel: {
    NONE: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3
  },

  TYPING_TIMEOUT: 10000,

  BITRATE_MIN: 8000,
  BITRATE_DEFAULT: 64000,
  BITRATE_MAX: 96000,
  BITRATE_MAX_VIP: 128000
};

function mirror(d) { Object.keys(d).forEach((k) => d[k] = k); }
function enumerate(d) { let c = 0; Object.keys(d).forEach((k) => d[k] = c++); }

mirror(Constants.Events);
mirror(Constants.EncryptionModes);
mirror(Constants.DiscordieState);

module.exports = Constants;

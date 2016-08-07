"use strict";

const Permissions = {
  General: {
    CREATE_INSTANT_INVITE: 1 << 0,
    KICK_MEMBERS: 1 << 1,
    BAN_MEMBERS: 1 << 2,
    ADMINISTRATOR: 1 << 3,
    MANAGE_CHANNELS: 1 << 4,
    MANAGE_GUILD: 1 << 5,
    CHANGE_NICKNAME: 1 << 26,
    MANAGE_NICKNAMES: 1 << 27,
    MANAGE_ROLES: 1 << 28,
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
    EXTERNAL_EMOTES: 1 << 18,
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
  Permissions.General.CHANGE_NICKNAME,
  Permissions.Text.READ_MESSAGES,
  Permissions.Text.SEND_MESSAGES,
  Permissions.Text.SEND_TTS_MESSAGES,
  Permissions.Text.EMBED_LINKS,
  Permissions.Text.ATTACH_FILES,
  Permissions.Text.READ_MESSAGE_HISTORY,
  Permissions.Text.MENTION_EVERYONE,
  Permissions.Text.EXTERNAL_EMOTES,
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
  Errors: {
    VOICE_DISCONNECTED_FROM_GATEWAY:
      error => `Disconnected from gateway socket: ${error}`,
    VOICE_SESSION_INVALIDATED:
      `Session has been invalidated`,
    VOICE_CHANGING_SERVER:
      "Changing server",
    VOICE_SESSION_DESCRIPTION_TIMEOUT:
      "Failed to connect to voice: VOICE_SESSION_DESCRIPTION timed out",
    VOICE_TRANSPORT_TIMEOUT:
      "Voice transport timed out",
    VOICE_KICKED_FROM_CHANNEL:
      "Kicked from the voice channel",
    VOICE_CONNECTED_FROM_ANOTHER_LOCATION:
      "Connected from another location",
    VOICE_GUILD_UNAVAILABLE:
      "Guild unavailable",
    VOICE_CALL_UNAVAILABLE:
      "Call unavailable",
    VOICE_MANUAL_DISCONNECT:
      "Manual disconnect"
  },
  Events: {
    // =============================== INTERNAL ===============================
    GATEWAY_OPEN: 0,
    GATEWAY_HELLO: 0,
    GATEWAY_DISPATCH: 0,
    GATEWAY_DISCONNECT: 0,
    GATEWAY_UNHANDLED_MESSAGE: 0,

    VOICESOCKET_OPEN: 0,
    VOICESOCKET_DISCONNECT: 0,
    VOICESOCKET_UNHANDLED_MESSAGE: 0,

    VOICE_READY: 0,
    VOICE_SESSION_DESCRIPTION: 0,
    VOICE_SPEAKING: 0,

    COLLECTION_READY: 0,
    READY_TASK_FINISHED: 0,

    LOADED_MORE_MESSAGES: 0,
    LOADED_PINNED_MESSAGES: 0,
    LOADED_GUILD_BANS: 0,

    ANY_GATEWAY_READY: 0, // fires on every gateway (primary and secondary)
    // No secondary gateways as of botapi multiserver voice release @2016-03-11

    // ================================= REST =================================
    REQUEST_AUTH_LOGIN_ERROR: 0, REQUEST_AUTH_LOGIN_SUCCESS: 0,
    REQUEST_GATEWAY_ERROR: 0, REQUEST_GATEWAY_SUCCESS: 0,

    // ================================ CUSTOM ================================

    /**
     * Emitted when login or gateway auth failed,
     * or primary gateway socket disconnects, closing all open sockets.
     *
     * Not emitted if disconnected using `client.disconnect()`.
     *
     * Property `error` can contain following `Error` messages:
     *
     * - ** `"Login failed"` **
     *
     *   Set if REST `/login` endpoint returned an error.
     *
     * - ** `"Could not get gateway"` **
     *
     *   Set if REST `/gateway` endpoint returned an error.
     *
     * - ** `"No token specified"` **
     *
     *   Should never fire under normal circumstances.
     *   Set if attempted to open gateway socket without token.
     *
     * - ** `"Heartbeat ACK did not arrive in time"` **
     *
     * - ** `"Failed to connect to gateway: READY timed out"` **
     *
     *   Set if server did not return a `READY` (initialization) packet
     *   within 5 minutes.
     *
     * - ** `"Disconnected from primary gateway"` **
     *
     *   Emitted for any other errors. Property `error.exception` will contain
     *   the `Number` error code from websocket.
     *
     * Original `Error` object or `Number` error code is stored
     * within `DiscordieError` and can be inspected using `error.exception`.
     * @event DISCONNECTED
     * @property {DiscordieError} error
     * @property {Boolean} [autoReconnect]
     * Only present (and set to true) when auto-reconnect is enabled.
     * @property {Number} [delay]
     * Delay in milliseconds until next reconnect attempt.
     * Only present when auto-reconnect is enabled.
     */
    DISCONNECTED: 0,

    /**
     * Emitted when the `Discordie` instance is ready to use.
     *
     * All objects except unavailable guilds and offline members of large guilds
     * (250+ members) will be in cache when this event fires.
     *
     * You can request offline members using `client.Users.fetchMembers()`.
     * See documentation for `IUserCollection.fetchMembers`.
     *
     * > **Note: Any other events may fire before `GATEWAY_READY`.**
     * @event GATEWAY_READY
     * @property {GatewaySocket} socket
     * @property {Object} data - Raw event data
     * @example
     * var client = new Discordie();
     * client.connect({ token: "bot_token" });
     * client.Dispatcher.on("GATEWAY_READY", e => {
     *   // all objects except offline members of large guilds
     *   // have been cached at this point
     * });
     */
    GATEWAY_READY: 0, // fires only on primary gateway

    /**
     * Emitted after gateway connection is resumed after a disconnect.
     *
     * Connections can be resumable if disconnected for short period of time.
     *
     * Does not clear cache unlike `GATEWAY_READY`.
     * @event GATEWAY_RESUMED
     * @property {GatewaySocket} socket
     * @property {Object} data - Raw event data
     */
    GATEWAY_RESUMED: 0,

    /**
     * Emitted when a new voice connection is fully initialized.
     * @event VOICE_CONNECTED
     * @property {VoiceSocket} socket
     * @property {IVoiceConnection} voiceConnection
     */
    VOICE_CONNECTED: 0,
    /**
     * Emitted when a voice socket disconnects.
     *
     * Property `error` can contain `null` or following `Error` messages:
     *
     * - ** `` `Disconnected from gateway socket: ${errorCode}` `` **
     *
     *   Set when an error occured on gateway socket.
     *
     * - ** `"Failed to connect to voice: VOICE_SESSION_DESCRIPTION timed out"` **
     *
     * - ** `"Voice transport timed out"` **
     *
     * - ** `"Connected from another location"` **
     *
     * - ** `"Kicked from the voice channel"` **
     *
     *   Set when server kicks the user from a voice channel,
     *   user accounts do not support botapi multiserver voice.
     *
     * - ** `"Changing server"` **
     *
     * - ** `"Guild unavailable"` **
     *
     *   This event fires before `GUILD_UNAVAILABLE`.
     *
     * - ** `"Call unavailable"` **
     *
     * - ** `"Session has been invalidated"` **
     *
     *   Set when the gateway connection could not be resumed and new
     *   session has been started. Fires for all previously active voice
     *   connections.
     *
     * - ** `"Manual disconnect"` **
     *
     *   Set if `channel.leave()` or `client.disconnect()` was called.
     *   Will also be set if channel or guild gets deleted (`VOICE_DISCONNECTED`
     *   emits before `GUILD_DELETE` or `CHANNEL_DELETE` respectively).
     *
     * If Discord decides to change voice servers - check if `endpointAwait`
     * is not null and contains a `Promise` which will resolve when a new
     * connection is fully initialized (`VOICE_CONNECTED` will also fire)
     * and reject if reconnect fails.
     *
     * Calls on `.join()` for channels of the same guild will return the same
     * promise.
     *
     * Call `.leave()` on pending connection's channel to cancel a reconnect.
     * Pending promise (`endpointAwait`) will be rejected with
     * `Error` message "Cancelled".
     *
     * If a gateway disconnects, pending connections that belong to the gateway
     * will be rejected with `Error` message `"Gateway disconnected"`.
     *
     * @event VOICE_DISCONNECTED
     * @property {VoiceSocket} socket
     * @property {IVoiceConnection} voiceConnection
     * @property {Error|null} error
     * @property {boolean} manual
     * Indicating whether was caused by `IVoiceChannel.leave()` or
     * `Discordie.disconnect()`, also true if channel/guild has been deleted
     * @property {Promise<VoiceConnectionInfo, Error|Number>} endpointAwait
     * Indicates whether there is a reconnect pending, reconnects can occur when
     * Discord decides to move users to another voice server
     * @example
     * client.Dispatcher.on("VOICE_DISCONNECTED", e => {
     *   const channel = e.voiceConnection.channel;
     *   if (!channel) return console.log("Channel has been deleted");
     *
     *   if (e.endpointAwait) {
     *     // handle reconnect instantly if it's a server-switch disconnect
     *     // transparently creates same promise as `oldChannel.join()`
     *     // see the `reconnect` function below
     *
     *     // Note: During Discord outages it will act like the official client
     *     //       and wait for an endpoint. Sometimes this can take a very
     *     //       long time. To cancel pending reconnect just call leave on
     *     //       the voice channel. Pending promise will reject with
     *     //       `Error` message "Cancelled".
     *
     *
     *     e.endpointAwait
     *     .then(info => onConnected(info))
     *     .catch(err => {
     *       // server switching failed, do a regular backoff
     *       setTimeout(() => reconnect(channel), 5000);
     *     });
     *     return;
     *   }
     *
     *   // normal disconnect
     *   setTimeout(() => reconnect(channel), 5000);
     * });
     * function reconnect(channel) {
     *   var channelName = channel.name;
     *   channel.join()
     *   .then(info => onConnected(info))
     *   .catch(err => console.log("Failed to connect to " + channelName));
     *   // this example will stop reconnecting after 1 attempt
     *   // you can continue trying to reconnect
     * }
     * function onConnected(info) {
     *   console.log("Connected to " + info.voiceConnection.channel.name);
     * }
     */
    VOICE_DISCONNECTED: 0,

    /**
     * Emitted when guild becomes unavailable.
     * Guild is deleted from cache until another `GUILD_CREATE`.
     * @event GUILD_UNAVAILABLE
     * @property {GatewaySocket} socket
     * @property {String} guildId
     */
    GUILD_UNAVAILABLE: 0,

    /**
     * Emitted when call becomes unavailable.
     * @event CALL_UNAVAILABLE
     * @property {GatewaySocket} socket
     * @property {String} channelId
     */
    CALL_UNAVAILABLE: 0,

    /**
     * Emitted when current user is being rung in a call.
     * @event CALL_RING
     * @property {GatewaySocket} socket
     * @property {IDirectMessageChannel} channel
     */
    CALL_RING: 0,

    /**
     * Emitted when `username`, `avatar` or `discriminator` difference detected
     * in an incoming `PRESENCE_UPDATE` event.
     * @event PRESENCE_MEMBER_INFO_UPDATE
     * @property {GatewaySocket} socket
     * @property {Object} old - Old instance of internal User model (immutable)
     * @property {Object} new - New instance of internal User model (immutable)
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
     *                         Next channel id if user moved to another channel
     * @property {String|null} newGuildId -
     *                         Next guild id if user moved to another channel
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
     * @property {boolean} state - Current state (is self muted)
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
     * @property {boolean} state - Current state (is self deafened)
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
     * @property {boolean} state - Current state (is muted globally)
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
     * @property {boolean} state - Current state (is deafened globally)
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
     * Emitted when a bot deletes more than 1 message at once.
     * @event MESSAGE_DELETE_BULK
     * @property {GatewaySocket} socket
     * @property {String} channelId
     * @property {Array<String>} messageIds
     * @property {Array<IMessage>} messages
     * Array of known deleted messages, can be empty
     */
    MESSAGE_DELETE_BULK: 0,
    /**
     * Emitted when user updates their message.
     * Contains null `message` if not cached.
     * @event MESSAGE_UPDATE
     * @property {GatewaySocket} socket
     * @property {IMessage|null} message
     * @property {Object} data - Raw message object received from server
     */
    MESSAGE_UPDATE: 0,

    /**
     * Emitted when on changes for username, avatar, status or game.
     *
     * Emitted multiple times for each shared guild with the local user and the
     * user presence is for.
     *
     * Compare `user.status` and `user.previousStatus` to detect status changes.
     *
     * Games can be checked with `user.game` and `user.previousGame`
     * (and helpers for names `user.gameName` and `user.previousGameName`)
     * respectively.
     *
     * > **Note:** Property `member` will contain `IUser` instance if user
     * >           has left the `guild`.
     *
     * @event PRESENCE_UPDATE
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     * @property {IUser} user
     * @property {IGuildMember|IUser} member
     */
    PRESENCE_UPDATE: 0,
    /**
     * @event TYPING_START
     * @property {GatewaySocket} socket
     * @property {IUser} user
     * @property {Number} timestamp - Unix timestamp
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
     * @property {Object} data - Raw channel object received from server
     */
    CHANNEL_DELETE: 0,
    /**
     * @event CHANNEL_UPDATE
     * @property {GatewaySocket} socket
     * @property {IChannel} channel
     */
    CHANNEL_UPDATE: 0,
    /**
     * Emitted when a user has been added to a group dm.
     * @event CHANNEL_RECIPIENT_ADD
     * @property {GatewaySocket} socket
     * @property {IDirectMessageChannel} channel
     * @property {IUser} user
     */
    CHANNEL_RECIPIENT_ADD: 0,
    /**
     * Emitted when a user has been removed or left from a group dm.
     * @event CHANNEL_RECIPIENT_REMOVE
     * @property {GatewaySocket} socket
     * @property {IDirectMessageChannel} channel
     * @property {IUser} user
     */
    CHANNEL_RECIPIENT_REMOVE: 0,

    /**
     * @event GUILD_CREATE
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     * @property {boolean} becameAvailable
     * Indicates whether the guild has recovered from unavailable state
     */
    GUILD_CREATE: 0,
    /**
     * @event GUILD_DELETE
     * @property {GatewaySocket} socket
     * @property {String} guildId
     * @property {Object} data - Raw guild object received from server
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
     * @property {Array<IRole>} rolesAdded
     * @property {Array<IRole>} rolesRemoved
     * @property {String|null} previousNick
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

    /**
     * @event GUILD_EMOJIS_UPDATE
     * @property {GatewaySocket} socket
     * @property {IGuild} guild
     */
    GUILD_EMOJIS_UPDATE: 0,

    /**
     * @event CALL_CREATE
     * @property {GatewaySocket} socket
     * @property {IDirectMessageChannel} channel
     * @property {ICall} call
     */
    CALL_CREATE: 0,
    /**
     * @event CALL_DELETE
     * @property {GatewaySocket} socket
     * @property {String} channelId
     * @property {Object} data - Raw object received from server
     */
    CALL_DELETE: 0,
    /**
     * @event CALL_UPDATE
     * @property {GatewaySocket} socket
     * @property {IDirectMessageChannel} channel
     * @property {ICall} call
     */
    CALL_UPDATE: 0,
  },
  ChannelTypes: {
    GUILD_TEXT: 0,
    DM: 1,
    GUILD_VOICE: 2,
    GROUP_DM: 3
  },
  MessageTypes: {
    DEFAULT: 0,
    RECIPIENT_ADD: 1,
    RECIPIENT_REMOVE: 2,
    CALL: 3,
    CHANNEL_NAME_CHANGE: 4,
    CHANNEL_ICON_CHANGE: 5
  },
  EncryptionModes: {
    plain: 0,
    xsalsa20_poly1305: 0,
  },

  ME: "@me",
  Endpoints: {
    CDN_AVATAR: (userId, hash) => `/avatars/${userId}/${hash}.jpg`,
    CDN_DM_ICON: (channelId, hash) => `/channel-icons/${channelId}/${hash}.jpg`,
    AVATAR: (userId, hash) => `/users/${userId}/avatars/${hash}.jpg`,
    GUILD_ICON: (guildId, hash) => `/guilds/${guildId}/icons/${hash}.jpg`,
    LOGIN: "/auth/login",
    ME: "/users/@me",
    TYPING: channelId => `/channels/${channelId}/typing`,
    CHANNEL_PERMISSIONS: channelId => `/channels/${channelId}/permissions`,
    CHANNEL_RECIPIENTS: channelId => `/channels/${channelId}/recipients`,
    MESSAGES: channelId => `/channels/${channelId}/messages`,
    PINS: channelId => `/channels/${channelId}/pins`,
    CHANNELS: "/channels",
    SETTINGS: "/users/@me/settings",
    GUILD_CHANNELS: guildId => `/guilds/${guildId}/channels`,
    GUILDS: "/guilds",
    INSTANT_INVITES: channelId => `/channels/${channelId}/invites`,
    CALL: channelId => `/channels/${channelId}/call`,
    CALL_RING: channelId => `/channels/${channelId}/call/ring`,
    CALL_STOP_RINGING: channelId => `/channels/${channelId}/call/stop-ringing`,

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
    GATEWAY: "/gateway",

    OAUTH2_APPLICATION: id => `/oauth2/applications/${id}`
  },
  API_VERSION: 6,
  get API_ENDPOINT() {
    return "https://discordapp.com/api/v" + this.API_VERSION;
  },
  CDN_ENDPOINT: "https://cdn.discordapp.com",

  Permissions: Permissions,
  PermissionsDefault: PermissionsDefault,
  PermissionSpecs: PermissionSpecs,

  StatusTypes: {
    ONLINE: "online",
    OFFLINE: "offline",
    IDLE: "idle"
  },

  ActivityTypes: {
    PLAYING: 0,
    STREAMING: 1
  },

  VerificationLevel: {
    NONE: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3
  },

  MFALevels: {
    NONE: 0,
    ELEVATED: 1
  },

  TYPING_TIMEOUT: 10000,

  BITRATE_MIN: 8000,
  BITRATE_DEFAULT: 64000,
  BITRATE_MAX: 96000,
  BITRATE_MAX_VIP: 128000,

  DISCORD_SAMPLE_RATE: 48000
};

function mirror(d) { Object.keys(d).forEach((k) => d[k] = k); }
function enumerate(d) { let c = 0; Object.keys(d).forEach((k) => d[k] = c++); }

mirror(Constants.Events);
mirror(Constants.EncryptionModes);
mirror(Constants.DiscordieState);

module.exports = Constants;

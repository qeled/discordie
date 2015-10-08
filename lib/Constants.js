"use strict";

var Constants = {
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
		PRESENCE_UPDATE: 0,
		//todo: add more proxy events like CHANNEL_CREATE and stuff?
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
		DEVICES: "/users/@me/devices",
		LOGOUT: "/auth/logout",
		REGISTER: "/auth/register",
		INVITE: "/invite",
		REGIONS: "/voice/regions",
		ICE: "/voice/ice",
		GATEWAY: "/gateway"
	},
	API_ENDPOINT: "https://discordapp.com/api",

	StatusTypes: {
		ONLINE: "online",
		OFFLINE: "offline",
		IDLE: "idle"
	},
	TYPING_TIMEOUT: 10000,
};

function mirror(d) { Object.keys(d).forEach((k) => d[k] = k); }
function enumerate(d) { var c = 0; Object.keys(d).forEach((k) => d[k] = c++); }

mirror(Constants.Events);
mirror(Constants.EncryptionModes);
enumerate(Constants.DiscordieState);

module.exports = Constants;

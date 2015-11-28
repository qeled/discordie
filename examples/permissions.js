"use strict";

// example bot

// commands:
// do - creates a role Testing, assigns it to the member, adds member permission for channel
// undo

var Discordie;
try { Discordie = require("../"); } catch(e) {}
try { Discordie = require("discordie"); } catch(e) {}

var client = new Discordie();
var Dispatcher = client.Dispatcher;
var Events = Discordie.Events;

var auth = {
	email: "discordie@example.com",
	password: ""
};
try { auth = require("./auth"); } catch(e) {}

function connect() { client.connect(auth); }
connect();

Dispatcher.on(Events.GATEWAY_READY, (e) => {
	console.log("Ready");
});

Dispatcher.on(Events.DISCONNECTED, (e) => {
	const delay = 5000;
	const sdelay = Math.floor(delay/100)/10;

	if (e.error.message.indexOf("gateway") >= 0) {
		console.log("Disconnected from gw, resuming in " + sdelay + " seconds");
	} else {
		console.log("Failed to log in or get gateway, reconnecting in " + sdelay + " seconds");
	}
	setTimeout(connect, delay);
});

Dispatcher.on(Events.MESSAGE_CREATE, (e) => {
	console.log("new message: ");
	console.log(JSON.stringify(e.message, null, "  "));
	console.log("e.message.content: " + e.message.content);

	var guild = e.message.guild;
	var channel = e.message.channel;
	var member = e.message.member;
	function onError(e) {
		if (!e) return console.error("Unknown error");

		if(e.response && e.response.error)
			return console.error(e.response.error);

		console.error(e.toString());
	}

	if(e.message.content == "ping") {
		e.message.channel.sendMessage("pong");
	}
	if(e.message.content == "do") {
		// chain of actions
		console.log(" >> creating role");

		guild.createRole()
		.then(assignRole)
		.catch(onError);

		function assignRole(role) {
			console.log(" >> assigning role");

			member.assignRole(role)
			.then(() => setRolePermissions(role))
			.catch(onError);
		}
		function setRolePermissions(role) {
			console.log(" >> setting role permissions");

			/*
			List of role permissions:
			  General: {
			    CREATE_INSTANT_INVITE,
			    KICK_MEMBERS,
			    BAN_MEMBERS,
			    MANAGE_ROLES,
			    MANAGE_CHANNELS,
			    MANAGE_GUILD,
			  },
			  Text: {
			    READ_MESSAGES,
			    SEND_MESSAGES,
			    SEND_TTS_MESSAGES,
			    MANAGE_MESSAGES,
			    EMBED_LINKS,
			    ATTACH_FILES,
			    READ_MESSAGE_HISTORY,
			    MENTION_EVERYONE,
			  },
			  Voice: {
			    CONNECT,
			    SPEAK,
			    MUTE_MEMBERS,
			    DEAFEN_MEMBERS,
			    MOVE_MEMBERS,
			    USE_VAD,
			  }
			*/

			var perms = role.permissions;
			perms.General.KICK_MEMBERS = true;
			perms.General.BAN_MEMBERS = true;
			perms.Text.MENTION_EVERYONE = true;

			// 'role.permissions' object resets on error

			var newRoleName = "Testing";
			var color = 0xE74C3C; // RED
			var hoist = true; // show separate group

			role.commit(newRoleName, color, hoist)
			.then(createChannelPermissions)
			.catch(onError);
		}
		function createChannelPermissions() {
			console.log(" >> creating channel permissions");

			channel.createPermissionOverwrite(member)
			.then(setChannelPermissions)
			.catch(onError);
		}
		function setChannelPermissions(overwrite) {
			console.log(" >> setting channel permissions");

			var allow = overwrite.allow;
			var deny = overwrite.deny;

			/*
			List of channel permissions:
			  General: {
			    CREATE_INSTANT_INVITE,
			    MANAGE_CHANNEL,
			    MANAGE_PERMISSIONS
			  },
			  Text: {
			    READ_MESSAGES,
			    SEND_MESSAGES,
			    SEND_TTS_MESSAGES,
			    MANAGE_MESSAGES,
			    EMBED_LINKS,
			    ATTACH_FILES,
			    READ_MESSAGE_HISTORY,
			    MENTION_EVERYONE,
			  },
			  Voice: {
			    CONNECT,
			    SPEAK,
			    MUTE_MEMBERS,
			    DEAFEN_MEMBERS,
			    MOVE_MEMBERS,
			    USE_VAD,
			  }
			*/

			// .Text only exists for text channels
			// .Voice only exists for voice channels
			// .General exists for both

			allow.General.MANAGE_CHANNEL = true;
			allow.General.MANAGE_PERMISSIONS = true;

			overwrite.commit()
			.then((overwrite) => console.log(" >> finished"))
			.catch(onError);
		}
		
	}
	if(e.message.content == "undo") {
		removeOverwrite();
		function removeOverwrite() {
			console.log(" >> removing overwrite");
			var overwrites = channel.permission_overwrites;
			var overwrite = overwrites.find(o => (o.id == member.id));
			if (!overwrite) {
				console.log(" >> no overwrite");
				unassignRoleTesting();
				return;
			}
			overwrite.delete()
			.then(unassignRoleTesting)
			.catch(onError);
		}
		function unassignRoleTesting() {
			console.log(" >> unassigning role");
			var role = member.roles.find(r => r.name == "Testing");
			if (!role) {
				console.log(" >> no role, finished");
				return;
			}
			member.unassignRole(role)
			.then(() => deleteRoleTesting(role))
			.catch(onError);
		}
		function deleteRoleTesting(role) {
			console.log(" >> unassigning role");

			role.delete()
			.then((overwrite) => console.log(" >> finished"))
			.catch(onError);
		}
	}
});

Dispatcher.onAny((type, e) => {
	var ignore = [
		"READY",
		"GATEWAY_READY",
		"ANY_GATEWAY_READY",
		"GATEWAY_DISPATCH",
		"PRESENCE_UPDATE",
		"TYPING_START",
	];
	if(ignore.find(t => (t == type || t == e.type))) {
		return console.log("<" + type + ">");
	}

	console.log("\nevent " + type);
	return console.log("args " + JSON.stringify(e));
});

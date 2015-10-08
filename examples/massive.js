"use strict";

// example bot

// commands:
// ping
// vjoin <channelname> -- joins matching channel for current guild
// vleave
// play -- plays test.mp3
// stop

var lame = require('lame');
var fs = require('fs');

var Discordie;
try { Discordie = require("../"); } catch(e) {}
try { Discordie = require("discordie"); } catch(e) {}

var client = new Discordie();

var auth = {
	email: "discordie@example.com",
	password: ""
};
try { auth = require("./auth"); } catch(e) {}

function connect() { client.connect(auth); }
connect();

client.Dispatcher.on(Discordie.Events.GATEWAY_READY, (e) => {
	// client.Users
	// client.Channels
	// client.DirectMessageChannels
	// client.Guilds
	// client.Messages
	// are collection interfaces with filter(fn), get(id), getBy(k, v)

	// client.User
	// contains current user

	const guild = client.Guilds.getBy("name", "test");
	// or:
	// client.Guilds.filter(g => (g.name == "test"))[0];

	// e.data contains raw READY event

	if (guild) {
		// guild.voiceChannels returns an array
		const general = guild.voiceChannels.filter(c => c.name == "General")[0];

		// IVoiceChannel.join(selfMute, selfDeaf)
		if (general)
			return general.join(false, false);

		return console.log("Channel not found");
	}
	console.log("Guild not found");
});

client.Dispatcher.on(Discordie.Events.DISCONNECTED, (e) => {
	const delay = 5000;
	const sdelay = Math.floor(delay/100)/10;

	if (e.error.message.indexOf("gateway") >= 0) {
		console.log("Disconnected from gw, resuming in " + sdelay + " seconds");
	} else {
		console.log("Failed to log in or get gateway, reconnecting in " + sdelay + " seconds");
	}
	setTimeout(connect, delay);
});

client.Dispatcher.on(Discordie.Events.MESSAGE_CREATE, (e) => {
	console.log("new message: ");
	console.log(JSON.stringify(e.message, null, "  "));
	console.log("e.message.content: " + e.message.content);

	if(e.message.content == "ping") {
		e.message.channel.sendMessage("pong");

		// e.message.reply("pong")
		// will prefix the message with a mention
	}
	if(e.message.content == "vleave") {
		var c = e.message.channel;

		client.Channels
		.filter(channel => channel.type == "voice")
		.forEach(channel => {
			if(channel.joined)
				channel.leave();
		});
	}
	if(e.message.content.indexOf("vjoin ") == 0) {
		const targetChannel = e.message.content.replace("vjoin ", "");

		e.message.channel.guild.voiceChannels
		.forEach(channel => {
			if(channel.name.toLowerCase().indexOf(targetChannel) >= 0)
				channel.join();
		});
	}
	if(e.message.content.indexOf("play") == 0) {
		play();
	}
	if(e.message.content.indexOf("stop") == 0) {
		stopPlaying = true;
	}
});
client.Dispatcher.on(Discordie.Events.MESSAGE_UPDATE, (e) => {
	console.log("updated message: ");
	console.log(JSON.stringify(e.message));
});
client.Dispatcher.on(Discordie.Events.MESSAGE_DELETE, (e) => {
	console.log("deleted message: ");
	console.log(JSON.stringify(e.message));

	// e.message now has 'e.message.deleted' set to true
	// properties in e.message will be null if the message is not cached
});

client.Dispatcher.on(Discordie.Events.VOICE_CONNECTED, (data) => {
	// client.voiceConnections is a temporary interface
	if(client.voiceConnections.length < 0) {
		console.log("Voice not connected");
		return;
	}

	// uncomment to play on join
	//play();
});

var stopPlaying = false;
function play() {
	stopPlaying = false;

	var mp3decoder = new lame.Decoder();
	mp3decoder.on('format', decode);
	fs.createReadStream("test.mp3").pipe(mp3decoder);

	function decode(pcmfmt) {
		var options = {
			frameDuration: 60,
			sampleRate: pcmfmt.sampleRate,
			channels: 2,
			float: false
		};

		const frameDuration = 60;

		var readSize =
			pcmfmt.sampleRate / 1000 *
			options.frameDuration *
			pcmfmt.bitDepth / 8 *
			pcmfmt.channels;

		mp3decoder.on('readable', function() {
			// WIP
			// client.voiceConnections[0].audioScheduler will be replaced

			var scheduler = client.voiceConnections[0].audioScheduler;
			scheduler.initialize(options);
			scheduler.onNeedBuffer = function() {
				var chunk = mp3decoder.read(readSize);
				if(chunk === null || stopPlaying) return;
				var sampleCount = readSize / pcmfmt.channels / (pcmfmt.bitDepth / 8);
				scheduler.enqueue(chunk, sampleCount);
			};
			scheduler.onNeedBuffer();
		});

		// restarting decoder without setTimeout causes glitches?
		mp3decoder.on('end', () => setTimeout(play, 100));
	}
}

client.Dispatcher.onAny((type, args) => {
	console.log("\nevent "+type);

	if(args.type == "READY" || args.type == "READY" || type == "GATEWAY_READY") {
		console.log("e "+type+" READY");
		return;
	}

	console.log("args "+JSON.stringify(args));
});

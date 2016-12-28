"use strict";

//// note: install ffmpeg/avconv first

// example bot

// commands:
// ping
// vjoin <channelname> -- joins matching channel for current guild
// vleave
// play -- plays test.mp3
// stop

var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

var Discordie;
try { Discordie = require("../../"); } catch(e) {}
try { Discordie = require("discordie"); } catch(e) {}

var client = new Discordie({autoReconnect: true});

var auth = { token: "<BOT-TOKEN>" };
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
		.filter(channel => channel.isGuildVoice && channel.joined)
		.forEach(channel => channel.leave());
	}
	if(e.message.content.indexOf("vjoin ") == 0) {
		const targetChannel = e.message.content.replace("vjoin ", "");

		e.message.channel.guild.voiceChannels
		.forEach(channel => {
			if(channel.name.toLowerCase().indexOf(targetChannel) >= 0)
				channel.join().then(v => play(v));
				// channel.join() returns a promise with voiceConnectionInfo
		});
	}
	if(e.message.content.indexOf("play") == 0) {
		if(!client.VoiceConnections.length) {
			return e.message.reply("Not connected to any channel");
		}
		play();
	}
	if(e.message.content.indexOf("stop") == 0) {
		stop();
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
	if(client.VoiceConnections.length <= 0) {
		return console.log("Voice not connected");
	}

	// uncomment to play on join
	//play();
});

function getConverter(args, options) {
	var binaries = [
		'ffmpeg',
		'ffmpeg.exe',
		'avconv',
		'avconv.exe'
	];

	var paths = process.env.PATH.split(path.delimiter).concat(["."]);

	for (var name of binaries) {
		for (var p of paths) {
			var binary = p + path.sep + name;
			if (!fs.existsSync(binary)) continue;
			return child_process.spawn(name, args, options);
		}
	}
	return null;
}

var ffmpeg = null;
function stop() {
	stopPlaying = true;
	if (!ffmpeg) return;
	ffmpeg.kill();
	ffmpeg = null;
}

var stopPlaying = false;
function play(voiceConnectionInfo) {
	stopPlaying = false;

	var sampleRate = 48000;
	var bitDepth = 16;
	var channels = 2;

	if (ffmpeg) ffmpeg.kill();

	ffmpeg = getConverter([
		"-re",
		"-i", "test.mp3",
		"-f", "s16le",
		"-ar", sampleRate,
		"-ac", channels,
		"-"
	], {stdio: ['pipe', 'pipe', 'ignore']});
	if (!ffmpeg) return console.log("ffmpeg/avconv not found");

	var _ffmpeg = ffmpeg;
	var ff = ffmpeg.stdout;

	// note: discordie encoder does resampling if rate != 48000
	var options = {
		frameDuration: 60,
		sampleRate: sampleRate,
		channels: channels,
		float: false
	};

	const frameDuration = 60;

	var readSize =
		sampleRate / 1000 *
		options.frameDuration *
		bitDepth / 8 *
		channels;

	ff.once('readable', function() {
		if(!client.VoiceConnections.length) {
			return console.log("Voice not connected");
		}
        
		if(!voiceConnectionInfo) {
			// get first if not specified
			voiceConnectionInfo = client.VoiceConnections[0];
		}
		var voiceConnection = voiceConnectionInfo.voiceConnection;
        
		// one encoder per voice connection
		var encoder = voiceConnection.getEncoder(options);

		const needBuffer = () => encoder.onNeedBuffer();
		encoder.onNeedBuffer = function() {
			var chunk = ff.read(readSize);

			if (_ffmpeg.killed) return;
			if (stopPlaying) return stop();

			// delay the packet if no data buffered
			if (!chunk) return setTimeout(needBuffer, options.frameDuration);

			var sampleCount = readSize / channels / (bitDepth / 8);
			encoder.enqueue(chunk, sampleCount);
		};

		needBuffer();
	});

	ff.once('end', () => {
		if (stopPlaying) return;
		setTimeout(play, 100, voiceConnectionInfo);
	});
}

client.Dispatcher.onAny((type, e) => {
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

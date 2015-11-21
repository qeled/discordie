"use strict";

// voice echo bot

// records and sends audio using `proxy` mode (without decoding/encoding/saving anything)
// variable `var recordTime = 30;` controls duration of recording in seconds

// commands:
// ~!~echo - joins voice channel and records audio, then plays recorded audio back
// ~!~stop - stops recording/playing

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

var recordTime = 30;
var recordTimer = null;

var recordReply = null;
var recordStartTime = null;
var recordedData = [];
var recordingUser = null;

client.Dispatcher.on(Discordie.Events.MESSAGE_CREATE, (e) => {
	console.log("new message: ");
	console.log(JSON.stringify(e.message, null, "  "));
	console.log("e.message.content: " + e.message.content);

	if(e.message.content == "~!~echo") {
		if (recordingUser)
			return e.message.reply("Already recording");

		const vchannels = e.message.channel.guild.voiceChannels;
		const channelToJoin = vchannels.find(c =>
			c.members.find(m => m.id == e.message.author.id)
		);
		if (!channelToJoin)
			return e.message.reply("Join a voice channel first");

		channelToJoin.join().then(info => {
			recordReply = e.message.reply.bind(e.message);
			e.message.reply("Recording audio for " + recordTime + " seconds");
			recordedData = [];
			recordingUser = e.message.author.id;
			recordStartTime = Date.now();

			recordTimer = setTimeout(() => {
				play(info);
				e.message.reply("Playing");
			}, recordTime * 1000);
		});
	}
	if(e.message.content == "~!~stop") {
		e.message.reply("Stopped");
		stopPlaying = true;
		recordingUser = false;
		if (recordTimer) {
			clearTimeout(recordTimer);
			recordTimer = null;
		}
	}
});

client.Dispatcher.on(Discordie.Events.VOICE_CONNECTED, (e) => {
	e.voiceConnection.getDecoder()
	.onPacket = (packet) => {
		const user = e.voiceConnection.ssrcToMember(packet.ssrc);
		if (!user) return;
		if (user.id != recordingUser) return;
		packet.playbackTime = Date.now() - recordStartTime;
		recordedData.push(packet);

		const name = user ? user.username : "<unknown>";
		console.log("recording "+packet.chunk.length+" bytes from "+name+" @ "+packet.timestamp);
	}
	// set callback on `.onPacketDecoded` to enable decoding and have decoded audio in `packet.chunk`
});

var stopPlaying = false;
function play(voiceConnectionInfo) {
	stopPlaying = false;
	var playbackStartTime = Date.now();

	function getSampleCountInPacket(data, sampleRate) {
		sampleRate = sampleRate || 48000;

		// src/opus_decode.c
		let audiosize;
		if (data[0] & 0x80) {
			audiosize = ((data[0] >> 3) & 0x3);
			audiosize = (sampleRate << audiosize) / 400;
		} else if ((data[0] & 0x60) == 0x60) {
			audiosize = (data[0] & 0x08) ? sampleRate / 50 : sampleRate / 100;
		} else {
			audiosize = ((data[0] >> 3) & 0x3);
			if (audiosize == 3) {
				audiosize = sampleRate * 60 / 1000;
			} else {
				audiosize = (sampleRate << audiosize) / 100;
			}
		}
		return audiosize;
	}

	if(!client.VoiceConnections.length)
		return console.log("Voice not connected");
	if(!voiceConnectionInfo)
		voiceConnectionInfo = client.VoiceConnections[0];
	var voiceConnection = voiceConnectionInfo.voiceConnection;

	var encoder = voiceConnection.getEncoder({ proxy: true });

	function sendPacket() {
		var packet = recordedData[0];
		if (!packet && recordReply) {
			recordReply("Finished playing");
		}
		if (!packet || stopPlaying) {
			recordingUser = null;
			return;
		}
		var currentTime = (Date.now() - playbackStartTime);
		var nextTime = packet.playbackTime - currentTime;
		setTimeout(sendPacket, nextTime);

		if (currentTime < nextTime) return;

		recordedData.shift(packet);
		var numsamples = getSampleCountInPacket(packet.chunk);
		encoder.enqueue(packet.chunk, numsamples);
	}
	sendPacket();
}

client.Dispatcher.onAny((type, args) => {
	console.log("\nevent "+type);

	if(args.type == "READY" || args.type == "READY" || type == "GATEWAY_READY") {
		console.log("e "+type+" READY");
		return;
	}

	console.log("args "+JSON.stringify(args));
});

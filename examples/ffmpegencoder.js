"use strict";

//// note: install ffmpeg/avconv first

// audio decoding and encoding using built in ffmpeg wrappers
// (opus encoding is done entierly by ffmpeg)

// commands:
// ping
// vjoin <channelname> -- joins matching channel for current guild
// vleave
// play -- plays test.mp3
// stop

var fs = require('fs');

var Discordie;
try { Discordie = require("../"); } catch(e) {}
try { Discordie = require("discordie"); } catch(e) {}

var client = new Discordie({autoReconnect: true});

var auth = { token: "<BOT-TOKEN>" };
try { auth = require("./auth"); } catch(e) {}

client.connect(auth);

client.Dispatcher.on("GATEWAY_READY", e => {
  const guild = client.Guilds.getBy("name", "test");
  if (!guild) return console.log("Guild not found");

  const general = guild.voiceChannels.find(c => c.name == "General");
  if (!general) return console.log("Channel not found");

  return general.join(false, false);
});

client.Dispatcher.on("MESSAGE_CREATE", (e) => {
  const content = e.message.content;
  const channel = e.message.channel;
  const guild = e.message.channel.guild;

  if (content == "ping") {
    channel.sendMessage("pong");
  }

  if (content == "vleave") {
    client.Channels
    .filter(channel => channel.isGuildVoice && channel.joined)
    .forEach(channel => channel.leave());
  }

  if (content.indexOf("vjoin ") == 0) {
    const targetChannel = content.replace("vjoin ", "");

    var vchannel =
      guild.voiceChannels
      .find(channel => channel.name.toLowerCase().indexOf(targetChannel) >= 0);
    if (vchannel) vchannel.join().then(info => play(info));
  }

  if (content.indexOf("play") == 0) {
    if (!client.VoiceConnections.length) {
      return e.message.reply("Not connected to any channel");
    }
    var info = client.VoiceConnections.getForGuild(guild);
    if (info) play(info);
  }

  if (content.indexOf("stop") == 0) {
    var info = client.VoiceConnections.getForGuild(guild);
    if (info) {
      var encoderStream = info.voiceConnection.getEncoderStream();
      encoderStream.unpipeAll();
    }
  }
});

client.Dispatcher.on("VOICE_CONNECTED", e => {
  // uncomment to play on join
  // play();
});

function play(info) {
  if (!client.VoiceConnections.length) {
    return console.log("Voice not connected");
  }

  if (!info) info = client.VoiceConnections[0];

  var encoder = info.voiceConnection.createExternalEncoder({
    type: "ffmpeg",
    source: "test.mp3"
  });
  if (!encoder) return console.log("Voice connection is no longer valid");

  encoder.once("end", () => play(info));

  var encoderStream = encoder.play();
  encoderStream.resetTimestamp();
  encoderStream.removeAllListeners("timestamp");
  encoderStream.on("timestamp", time => console.log("Time " + time));
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
  if (ignore.find(t => (t == type || t == e.type))) {
    return console.log("<" + type + ">");
  }

  console.log("\nevent " + type);
  return console.log("args " + JSON.stringify(e));
});

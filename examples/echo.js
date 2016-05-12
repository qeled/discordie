"use strict";

// voice echo bot

// records and sends audio using `proxy` mode (without decoding/encoding/saving anything)
// variable `var recordTime = 10;` controls duration of recording in seconds

// commands:
// ~!~echo - joins voice channel and records audio, then plays recorded audio back
// ~!~stop - stops recording/playing

var fs = require('fs');

var Discordie;
try { Discordie = require("../"); } catch(e) {}
try { Discordie = require("discordie"); } catch(e) {}

var client = new Discordie({autoReconnect: true});

var auth = { token: "<BOT-TOKEN>" };
try { auth = require("./auth"); } catch(e) {}

client.connect(auth);

var recordTime = 10;
var recordTimer = null;

var recordReply = null;
var recordStartTime = null;
var recordedData = [];
var recordingUser = null;

client.Dispatcher.on("MESSAGE_CREATE", e => {
  console.log("new message: ");
  console.log(JSON.stringify(e.message, null, "  "));
  console.log("e.message.content: " + e.message.content);

  const content = e.message.content;
  const guild = e.message.channel.guild;

  if (content == "~!~echo") {
    if (recordingUser)
      return e.message.reply("Already recording");

    const channelToJoin = e.message.author.getVoiceChannel(guild);
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

  if (content == "~!~stop") {
    e.message.reply("Stopped");
    stopPlaying = true;
    recordingUser = false;
    if (recordTimer) {
      clearTimeout(recordTimer);
      recordTimer = null;
    }
  }
});

client.Dispatcher.on("VOICE_CONNECTED", e => {
  e.voiceConnection.getDecoder()
  .onPacket = (packet) => {
    const user = e.voiceConnection.ssrcToMember(packet.ssrc);
    if (!user) return;
    if (user.id != recordingUser) return;
    packet.playbackTime = Date.now() - recordStartTime;
    recordedData.push(packet);

    const name = user ? user.username : "<unknown>";
    console.log(
      "recording " + packet.chunk.length +
      " bytes from " + name +
      " @ " + packet.timestamp
    );
  };
  // set callback on `.onPacketDecoded` to enable decoding and
  // have decoded audio in `packet.chunk`
});

var stopPlaying = false;
function play(info) {
  stopPlaying = false;
  var playbackStartTime = Date.now();

  if (!client.VoiceConnections.length)
    return console.log("Voice not connected");

  if (!info) info = client.VoiceConnections[0];
  var voiceConnection = info.voiceConnection;

  var encoder = voiceConnection.getEncoder({ frameDuration: 20, proxy: true });

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
    var numSamples = opus_packet_get_samples_per_frame(packet.chunk);
    console.log("playing ", packet.chunk.length, numSamples);
    encoder.enqueue(packet.chunk, numSamples);
  }
  sendPacket();
}

client.Dispatcher.onAny((type, args) => {
  console.log("\nevent "+type);

  if (args.type == "READY" || args.type == "READY" ||
      type == "GATEWAY_READY" || type == "ANY_GATEWAY_READY" ||
      type == "GATEWAY_DISPATCH") {
    return console.log("e " + (args.type || type));
  }

  console.log("args " + JSON.stringify(args));
});

// ===========================================================================
// Opus helper functions
// ===========================================================================

const Constants = {
  OPUS_BAD_ARG: -1,
  OPUS_INVALID_PACKET: -4
};

function opus_packet_get_samples_per_frame(packet, sampleRate) {
  sampleRate = sampleRate || 48000;

  let audiosize;
  if (packet[0] & 0x80) {
    audiosize = ((packet[0] >> 3) & 0x3);
    audiosize = (sampleRate << audiosize) / 400;
  } else if ((packet[0] & 0x60) == 0x60) {
    audiosize = (packet[0] & 0x08) ? sampleRate / 50 : sampleRate / 100;
  } else {
    audiosize = ((packet[0] >> 3) & 0x3);
    if (audiosize == 3) {
      audiosize = sampleRate * 60 / 1000;
    } else {
      audiosize = (sampleRate << audiosize) / 100;
    }
  }
  return audiosize;
}

function opus_packet_get_nb_frames(packet) {
  var count;
  if (packet.length < 1) return Constants.OPUS_BAD_ARG;
  count = packet[0] & 0x3;

  if (count == 0) return 1;
  else if (count != 3) return 2;
  else if (packet.length < 2) return Constants.OPUS_INVALID_PACKET;
  else return packet[1] & 0x3F;
}

function opus_packet_get_nb_samples(packet, sampleRate)
{
  sampleRate = sampleRate || 48000;

  var count = opus_packet_get_nb_frames(packet);
  if (count < 0) return count;

  var samples = count * opus_packet_get_samples_per_frame(packet, sampleRate);
  /* Can't have more than 120 ms */
  if (samples * 25 > sampleRate * 3)
    return Constants.OPUS_INVALID_PACKET;
  return samples;
}
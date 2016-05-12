"use strict";

// voice echo bot

// simple audio proxy - mirrors user's audio
//   can be useful for redirecting audio into another channel/server through
//   different bot instance

// commands:
// ~!~start - starts proxying audio for the invoker
// ~!~stop - stops proxying audio for the invoker

var fs = require('fs');

var Discordie;
try { Discordie = require("../"); } catch(e) {}
try { Discordie = require("discordie"); } catch(e) {}

var client = new Discordie({autoReconnect: true});

var auth = { token: "<BOT-TOKEN>" };
try { auth = require("./auth"); } catch(e) {}

client.connect(auth);

var proxyingUser = null;

client.Dispatcher.on("MESSAGE_CREATE", e => {
  console.log("new message: ");
  console.log(JSON.stringify(e.message, null, "  "));
  console.log("e.message.content: " + e.message.content);

  const content = e.message.content;
  const guild = e.message.channel.guild;

  if (content == "~!~start") {
    if (proxyingUser)
      return e.message.reply("Already proxying");

    const channelToJoin = e.message.author.getVoiceChannel(guild);
    if (!channelToJoin)
      return e.message.reply("Join a voice channel first");

    channelToJoin.join().then(info => {
      e.message.reply("Proxying audio for user " + e.message.author.username);
      proxyingUser = e.message.author.id;
    });
  }

  if (content == "~!~stop") {
    e.message.reply("Stopped");
    proxyingUser = null;
  }
});

client.Dispatcher.on("VOICE_CONNECTED", e => {
  var encoder = e.voiceConnection.getEncoder({ frameDuration: 20, proxy: true });
  var decoder = e.voiceConnection.getDecoder();

  decoder.onPacket = (packet) => {
    if (!proxyingUser) return;

    const user = e.voiceConnection.ssrcToMember(packet.ssrc);
    if (!user) return;
    if (user.id != proxyingUser) return;

    const name = user ? user.username : "<unknown>";
    console.log(
      "proxying " + packet.chunk.length +
      " bytes from " + name +
      " @ " + packet.timestamp
    );

    var numSamples = opus_packet_get_samples_per_frame(packet.chunk);
    encoder.enqueue(packet.chunk, numSamples);
  };
  // set callback on `.onPacketDecoded` to enable decoding and
  // have decoded audio in `packet.chunk`
});

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
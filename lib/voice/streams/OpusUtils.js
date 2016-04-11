"use strict";

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

module.exports = {
  Constants,
  packet_get_samples_per_frame: opus_packet_get_samples_per_frame,
  packet_get_nb_frames: opus_packet_get_nb_frames,
  packet_get_nb_samples: opus_packet_get_nb_samples
};
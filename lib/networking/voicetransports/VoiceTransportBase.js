"use strict";

const nacl = require("ecma-nacl");
const Constants = require("../../Constants");
const Utils = require("../../core/Utils");

const UNIXTIME_OFFSET_70_YEARS_OR_SO = 2208988800000;

const RTCP_OFFSET_MSW_TIMESTAMP = 8;
const RTCP_OFFSET_LSW_TIMESTAMP = 12;
const RTCP_OFFSET_RTP_TIMESTAMP = 16;
const RTCP_OFFSET_PACKETS_SENT = 20;
const RTCP_OFFSET_BYTES_SENT = 24;

class VoiceTransportBase {
  constructor(voicews, ssrc) {
    this.voicews = voicews;
    this.ssrc = ssrc;

    this.onAudioPacket = null;

    {
      // rtp packet header
      this.header = new Buffer(24);
      this.header.fill(0);
      this.header[0] = 0x80; // rtp protocol version 2
      this.header[1] = 0x78; // rtp payload type
      this.header.writeUInt32BE(ssrc, 8);
    }

    {
      this.decryptionNonce = new Buffer(24);
      this.decryptionNonce.fill(0);
    }

    {
      // maybe todo: refactor this whole mess

      // rtcp sender report
      this.rtcpSenderReport = new Buffer(40);
      this.rtcpSenderReport.fill(0);
      this.rtcpSenderReport[0] = 0x80; // rtp protocol version 2
      this.rtcpSenderReport[1] = 0xc8; // type rtcp sender report
      this.rtcpSenderReport.writeUInt16BE(6, 2); // length: 6
      {
        this.rtcpSenderReport.writeUInt32BE(ssrc, 4);
        this.rtcpSenderReport.writeUInt32BE(0, RTCP_OFFSET_MSW_TIMESTAMP);
        this.rtcpSenderReport.writeUInt32BE(0, RTCP_OFFSET_LSW_TIMESTAMP);
        this.rtcpSenderReport.writeUInt32BE(0, RTCP_OFFSET_RTP_TIMESTAMP);
        this.rtcpSenderReport.writeUInt32BE(0, RTCP_OFFSET_PACKETS_SENT);
        this.rtcpSenderReport.writeUInt32BE(0, RTCP_OFFSET_BYTES_SENT);
      }

      // rtcp source description
      this.rtcpSenderReport[28] = 0x81; // rtp protocol version 2, src cnt 1
      this.rtcpSenderReport[29] = 0xca; // type rtcp source description
      this.rtcpSenderReport.writeUInt16BE(2, 30); // length: 2
      {
        {
          this.rtcpSenderReport.writeUInt32BE(ssrc, 32);
        }
        {
          this.rtcpSenderReport[36] = 1; // type CNAME
          this.rtcpSenderReport[37] = 0; // length 0
          this.rtcpSenderReport[38] = 0; // type END
          this.rtcpSenderReport[39] = 0; // length 0
        }
      }

      this.rtcpSenderReportNonce = new Buffer(24);
      this.rtcpSenderReportNonce.fill(0);
      this.rtcpSenderReport.copy(this.rtcpSenderReportNonce, 0, 0, 8);

      this.rtcpSenderReportEncrypted = new Buffer(40 + 16);
      this.rtcpSenderReportEncrypted.fill(0);
      this.rtcpSenderReport.copy(this.rtcpSenderReportEncrypted, 0, 0, 8);
    }

    this.reinitialize();

    this.readyState = Constants.ReadyState.CLOSED;
  }
  get connecting() {
    return this.readyState == Constants.ReadyState.CONNECTING;
  }
  get connected() {
    return this.readyState == Constants.ReadyState.OPEN;
  }
  _encrypt(packet, nonce) {
    if (this.voicews.mode != Constants.EncryptionModes.xsalsa20_poly1305)
      return packet;

    const packetView =
      new Uint8Array(Utils.createArrayBuffer(packet));
    const nonceView =
      new Uint8Array(Utils.createArrayBuffer(nonce));

    return nacl.secret_box.pack(packetView, nonceView, this.voicews.secret);
  }
  _decrypt(packet) {
    if (this.voicews.mode != Constants.EncryptionModes.xsalsa20_poly1305)
      return packet;

    const header = packet.slice(0, 12);

    if (packet.length < 12 + 16)
      return header;

    header.copy(this.decryptionNonce);

    const audioDataView =
      new Uint8Array(Utils.createArrayBuffer(packet.slice(12)));
    const nonceView =
      new Uint8Array(Utils.createArrayBuffer(this.decryptionNonce));

    const decrypted =
      nacl.secret_box.open(audioDataView, nonceView, this.voicews.secret);

    const decryptedPacket = new Buffer(packet.length - 16);
    header.copy(decryptedPacket);
    for (let i = 0; i < decrypted.length; i++) {
      decryptedPacket[12 + i] = decrypted[i];
    }
    return decryptedPacket;
  }
  _resizePacket(packet) {
    // add a byte so it doesn't look like initialization message
    const packetLength = (packet || []).length;
    const resultingLength =
      this.voicews.mode == Constants.EncryptionModes.xsalsa20_poly1305 ?
      packetLength + 12 + 16 :
      packetLength + 12;

    if (resultingLength == 70) {
      packet = Buffer.concat([packet, new Buffer(1)]);
    }
    return packet;
  }
  mux(packet, sampleCount) {
    this.header.writeUInt16BE(this.sequence, 2);
    this.header.writeUInt32BE(this.timestamp, 4);

    const packetLength = (packet || []).length;
    packet = this._resizePacket(packet);
    packet = this._encrypt(packet, this.header);

    const rtpPacket = new Buffer(packet.length + 12);
    this.header.copy(rtpPacket, 0, 0, 12);
    for (let i = 0; i < packet.length; i++) {
      rtpPacket[12 + i] = packet[i];
    }

    this.sequence++;
    this.timestamp += sampleCount;

    this.sequence %= 0xFFFF + 1;
    this.timestamp %= 0xFFFFFFFF + 1;

    this.packetsSent++;
    this.packetsSent %= 0xFFFFFFFF + 1;
    this.bytesMuxed += packetLength;
    this.bytesMuxed %= 0xFFFFFFFF + 1;

    return rtpPacket;
  }
  demux(packet) {
    if (typeof this.onAudioPacket !== "function")
      return;

    try {
      packet = this._decrypt(packet);
    } catch (e) {
      return console.error(e.stack);
    }

    const seq = packet.readUInt16BE(2);
    const timestamp = packet.readUInt32BE(4);
    const ssrc = packet.readUInt32BE(8);
    const chunk = packet.slice(12);

    this.onAudioPacket({
      seq: seq,
      timestamp: timestamp,
      ssrc: ssrc,
      chunk: chunk
    });
  }
  updateSenderReportRTCP() {
    const rtcp = this.rtcpSenderReport;
    var time = Date.now() + UNIXTIME_OFFSET_70_YEARS_OR_SO;
    var msw = time / 1000;
    var lsw = (msw - Math.floor(msw)) * 0xFFFFFFFF;
    rtcp.writeUInt32BE(msw, RTCP_OFFSET_MSW_TIMESTAMP);
    rtcp.writeUInt32BE(lsw, RTCP_OFFSET_LSW_TIMESTAMP);
    rtcp.writeUInt32BE(this.timestamp, RTCP_OFFSET_RTP_TIMESTAMP);
    rtcp.writeUInt32BE(this.packetsSent, RTCP_OFFSET_PACKETS_SENT);
    rtcp.writeUInt32BE(this.bytesMuxed, RTCP_OFFSET_BYTES_SENT);

    if (this.voicews.mode != Constants.EncryptionModes.xsalsa20_poly1305)
      return rtcp;

    const encryptedPart = Utils.createBuffer(
      this._encrypt(
        rtcp.slice(8),
        this.rtcpSenderReportNonce
      )
    );

    encryptedPart.copy(this.rtcpSenderReportEncrypted, 8);

    return this.rtcpSenderReportEncrypted;
  }
  reinitialize() {
    this.sequence = Math.round(Math.random() * 0xFFFF) - 1;
    this.timestamp = 0;

    this.packetsSent = 0;
    this.bytesMuxed = 0;
  }
}

module.exports = VoiceTransportBase;

"use strict";

const BaseSocket = require("./BaseSocket");
const Constants = require("../../Constants");
const Errors = Constants.Errors;
const Events = Constants.Events;
const EncryptionModes = Constants.EncryptionModes;
const AudioEncoder = require("../../voice/AudioEncoder");
const AudioDecoder = require("../../voice/AudioDecoder");
const VoiceUDP = require("../voicetransports/VoiceUDP");
const DiscordieError = require("../../core/DiscordieError");

const OPCODE_IDENTIFY = 0;
const OPCODE_SELECT_PROTOCOL = 1;
const OPCODE_READY = 2;
const OPCODE_HEARTBEAT = 3;
const OPCODE_SESSION_DESCRIPTION = 4;
const OPCODE_SPEAKING = 5;

const VOICE_SESSION_DESCRIPTION_TIMEOUT = 30 * 1000; // 30 seconds

class VoiceSocket {
  constructor(_gateway, guildId) {
    this.Dispatcher = _gateway.Dispatcher;
    this.gatewaySocket = _gateway;
    this.guildId = guildId;
    this.socket = null;
    this.audioEncoder = new AudioEncoder(this);
    this.audioDecoder = new AudioDecoder(this);
    this.speakingQueue = [];
    this.disposed = false;
  }
  get canStream() {
    return this.connected && this.audioTransportSocket;
  }
  get connected() {
    return this.socket && this.socket.connected;
  }
  get connecting() {
    return this.socket && this.socket.connecting;
  }
  get transport() {
    if (this.audioTransportSocket) {
      if (this.audioTransportSocket instanceof VoiceUDP)
        return "udp";
    }
    return "none";
  }
  connect(server, serverId, userId, sessionId, voiceToken) {
    if (this.connected)
      this.disconnect();

    if (this.disposed)
      throw new Error("Called 'connect' on disposed VoiceSocket");

    const emitSpeaking = (packet) => {
      this.Dispatcher.emit(
        Events.VOICE_SPEAKING,
        {socket: this, data: packet}
        //data.user_id, data.ssrc, data.speaking
      );
      if (this.audioDecoder)
        this.audioDecoder.assignUser(packet.ssrc, packet.user_id);
    };

    this.voiceServer = server;
    this.voiceServerURL = "wss://" + server;
    this.socket = new BaseSocket(this.voiceServerURL);
    this.socket.on("open", e => {
      this.Dispatcher.emit(Events.VOICESOCKET_OPEN, {socket: this});

      this.identify(serverId, userId, sessionId, voiceToken);

      this.socket._startTimeout(() => {
        return this.disconnect(new DiscordieError(
          Errors.VOICE_SESSION_DESCRIPTION_TIMEOUT
        ));
      }, VOICE_SESSION_DESCRIPTION_TIMEOUT);
    });
    this.socket.on("message", e => {
      if (!this.socket) return;

      const msg = JSON.parse(e);
      const op = msg.op;
      const data = msg.d;

      if (op === OPCODE_READY) {
        if (data.heartbeat_interval > 0) {
          this.socket.setHeartbeat(
            () => this.heartbeat(),
            data.heartbeat_interval
          );
        }

        this.Dispatcher.emit(
          Events.VOICE_READY,
          {socket: this, data: data}
        );
      } else if (op === OPCODE_SPEAKING) {
        this.canStream && this.audioTransportSocket.connected ?
          emitSpeaking(data) :
          this.speakingQueue.push(data);
      } else if (op === OPCODE_SESSION_DESCRIPTION) {
        this.socket._stopTimeout();

        if (data.secret_key && data.secret_key.length > 0) {
          const buffer = new ArrayBuffer(data.secret_key.length);
          this.secret = new Uint8Array(buffer);
          for (let i = 0; i < this.secret.length; i++) {
            this.secret[i] = data.secret_key[i];
          }
        }

        if (this.canStream) {
          this.Dispatcher.emit(
            Events.VOICE_SESSION_DESCRIPTION,
            {socket: this, data: data}
            //data.secret_key, data.mode
          );

          this.speakingQueue.forEach(packet => emitSpeaking(packet));
          this.speakingQueue.length = 0;

          // required to start receiving audio from other users
          this.audioTransportSocket.sendSenderInfo();
        }
      }
    });

    const close = (code, desc) => this.disconnect(code, desc, true);
    this.socket.on("close", close);
    this.socket.on("error", close);
  }
  disconnect(error, description, causedByEvent) {
    if (!this.disposed) {
      this.disposed = true;
      let msg = {socket: this, error: new Error(Errors.VOICE_MANUAL_DISCONNECT)};
      if (error) msg.error = error;
      if (description) msg.description = description;
      this.Dispatcher.emit(Events.VOICESOCKET_DISCONNECT, msg);
    }

    if (this.audioTransportSocket) {
      this.audioTransportSocket.close();
      this.audioTransportSocket = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.audioEncoder) {
      this.audioEncoder.kill();
      this.audioEncoder = null;
    }

    if (this.audioDecoder) {
      this.audioDecoder.kill();
      this.audioDecoder = null;
    }

    delete this.secret;
    this.speakingQueue.length = 0;
  }
  heartbeat() {
    this.socket.send(OPCODE_HEARTBEAT, Date.now());
  }
  identify(serverId, userId, sessionId, token) {
    this.socket.send(OPCODE_IDENTIFY, {
      server_id: serverId,
      user_id: userId,
      session_id: sessionId,
      token: token
    });
  }
  selectProtocol(protocol, data) {
    if (!data) data = null;
    this.socket.send(OPCODE_SELECT_PROTOCOL, {protocol, data});
  }
  speaking(speaking, delay) {
    if (!delay) delay = 0;
    this.socket.send(OPCODE_SPEAKING, {speaking, delay});
  }

  connectAudioTransport(ssrc, serverPort, modes) {
    if (!this.connected)
      return;

    this.mode = EncryptionModes.plain;

    if (modes && modes.indexOf(EncryptionModes.xsalsa20_poly1305) >= 0) {
      this.mode = EncryptionModes.xsalsa20_poly1305;
    }

    if (this.audioTransportSocket) {
      this.audioTransportSocket.close();
    }

    const transport = new VoiceUDP(this, ssrc, this.voiceServer, serverPort);
    this.audioTransportSocket = transport;

    transport.onConnect = () => {
      this.audioTransportSocket = transport;
      this.selectProtocol(this.transport, {
        ip: this.audioTransportSocket.localip,
        port: this.audioTransportSocket.localport,
        mode: this.mode
      });
    };
    transport.onAudioPacket = (packet) => {
      if (!this.audioDecoder)
        return;
      if (typeof this.audioDecoder.enqueue !== "function")
        throw new Error("AudioDecoder does not implement enqueue()");

      this.audioDecoder.enqueue(packet);
    };
    transport.onError = (error) => {
      this.disconnect(error);
    };
    transport.onTimeout = () =>
      transport.onError(new DiscordieError(Errors.VOICE_TRANSPORT_TIMEOUT));

    transport.connect();
  }

  toJSON() { return `[VoiceSocket ${this.voiceServerURL}]`; }
}

module.exports = VoiceSocket;

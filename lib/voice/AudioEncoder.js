"use strict";

const fork = require("child_process").fork;
const EncoderWorker = require("./threading/EncoderWorker");

const defaultOptions = {
  multiThreadedVoice: false,
};

class AudioEncoder {
  constructor(voicews, options) {
    this.options = {};

    this.voicews = voicews;
    this.onNeedBuffer = null;

    this.initialize(options);
  }
  get canStream() {
    return this.voicews && this.voicews.canStream;
  }
  get disposed() {
    return this.worker == null;
  }
  initialize(options) {
    if (!options) options = defaultOptions;

    const hasChanges = Object.keys(options).reduce((r, k) => {
      return r || (this.options[k] != options[k])
    }, false);
    if (hasChanges) this.kill();

    this.options = options;

    if (this.disposed) {
      if (options.multiThreadedVoice) {
        this.worker = fork(__dirname + "/threading/EncoderWorker");
      } else {
        this.worker = new EncoderWorker();
      }

      this.worker.on("message", (msg) => {
        switch (msg.op) {
        case "needbuffer":
          if (typeof this.onNeedBuffer === "function")
            this.onNeedBuffer();
          break;
        case "opuspacket":
          if (this.voicews.connected && !this.voicews.audioTransportSocket)
            throw new Error("No transport");

          if (!this.voicews.connected) break;
          if (!msg.packet) break;

          let packetData = msg.packet.data;
          if (msg.packet instanceof Buffer)
            packetData = msg.packet;

          this.voicews.audioTransportSocket
            .send(packetData, msg.sampleCount);
          break;
        }
      });
    }

    this.worker.send({
      op: "initialize",
      options
    });

    this.onNeedBuffer = null;
  }
  setVolume(volume) {
    if (this.disposed) return;
    this.worker.send({
      op: "set",
      key: "volume",
      value: volume
    });
  }
  setBitrate(bitrate) {
    if (this.disposed) return;
    this.worker.send({
      op: "setBitrate",
      value: bitrate
    });
  }
  enqueue(chunk, sampleCount) {
    if (this.disposed) return;
    this.worker.send({
      op: "enqueue",
      frame: {
        chunk: chunk,
        sampleCount: sampleCount
      }
    });
  }
  kill() {
    if (this.disposed) return;
    this.worker.kill();
    this.worker = null;
  }
}

module.exports = AudioEncoder;

"use strict";

const fork = require("child_process").fork;
const DecoderWorker = require("./threading/DecoderWorker");
const Utils = require("../core/Utils");

const defaultOptions = {
	multiThreadedVoice: false,
};

class AudioDecoder {
	constructor(voicews, options) {
		if (!options) options = defaultOptions;

		this.voicews = voicews;
		this.onPacketDecoded = null;

		this.initialize(options);

		this.worker.on("message", (msg) => {
			switch (msg.op) {
			case "packet":
				if (!msg.packet) break;
				const packet = msg.packet;

				if (packet.chunk.data && packet.chunk.data.length > 0)
					packet.chunk = Utils.createBuffer(packet.chunk.data);

				if (!(packet.chunk instanceof Buffer))
					return;

				if (typeof this.onPacketDecoded === "function")
					this.onPacketDecoded(packet);

				break;
			}
		});
	}
	enqueue(packet) {
		if (!this.onPacketDecoded)
			return;

		if (this.disposed) {
			if (this.onPacketDecoded !== null)
				throw new Error("AudioDecoder is not initialized");
			return;
		}
		this.worker.send({
			op: "enqueue",
			packet: packet
		});
	}
	get disposed() {
		return this.worker == null;
	}
	initialize(options) {
		if (this.disposed) {
			if (options.multiThreadedVoice) {
				this.worker = fork(__dirname + "/threading/DecoderWorker");
			} else {
				this.worker = new DecoderWorker();
			}
		}
		if (!options) options = defaultOptions;
		this.worker.send({
			op: "initialize",
			options
		});

		this.onPacketDecoded = null;
	}
	kill() {
		if (this.disposed) return;
		this.worker.kill();
		this.worker = null;
	}
}

module.exports = AudioDecoder;

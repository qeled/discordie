"use strict";
module.exports = {
	createArrayBuffer(source) {
		const view = new Uint8Array(new ArrayBuffer(source.length));
		for (let i = 0; i < view.length; i++)
			view[i] = source[i];
		return view.buffer;
	},
	createBuffer(source) {
		if (source.constructor.name == "Float32Array") {
			const buf = new Buffer(source.length * 4);
			for (let i = 0; i < source.length; i++) {
				buf.writeFloatLE(source[i], i * 4);
			}
			return buf;
		}

		const view = new Uint8Array(source);
		const buf = new Buffer(view.length);
		for (let i = 0; i < view.length; i++)
			buf[i] = view[i];
		return buf;
	},
	bindGatewayEventHandlers(source, event, map) {
		if(!event.type)
			throw new Error("Invalid event");

		if(!(event.type in map))
			return;

		for(let k in map) {
			if(typeof map[k] !== "function")
				throw new Error(`Invalid handler ${k} for event ${event.type}`);
			map[k] = map[k].bind(source);
		}

		if(map[event.type](event.data))
			event.handled = true;
	},
	privatify(target) {
		for (let k in target) {
			if (k.indexOf("_") != 0)
				continue;
			Object.defineProperty(target, k, {enumerable: false});
		}
	}
}

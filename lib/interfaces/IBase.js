"use strict";

const Utils = require("../core/Utils");

class IBase {
	constructor(proto, get) {
		const interfacingProperties = new proto();
		for(let key in interfacingProperties) {
			Object.defineProperty(this, key, {
				enumerable: true,
				get: () => {
					try {
						return get(key);
					} catch(e) {
						console.log(e.stack);
						return null;
					}
				}
			});
		}
	}
	getRaw() {
		const copy = {};
		for(let key in this)
			copy[key] = this[key];
		return copy;
	}

	valueOf() {
		if(!this.id) return null;
		return this.id;
	}
	equals(b) {
		return this.valueOf() === b.valueOf();
	}
}

module.exports = IBase;

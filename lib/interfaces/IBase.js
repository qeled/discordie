"use strict";

const Utils = require("../core/Utils");

class IBase {
	constructor(proto, get) {
		this._valueOverrides = {};
		this._inherit(proto, get);
	}
	_inherit(proto, get) {
		const interfacingProperties = new proto();
		for(let key in interfacingProperties) {
			Object.defineProperty(this, key, {
				enumerable: true,
				configurable: true,
				get: () => {
					try {
						const value = get(key);
						if(value && this._valueOverrides[key]) {
							return this._valueOverrides[key](value);
						}
						return value;
					} catch(e) {
						console.log(e.stack);
						return null;
					}
				}
			});
		}
	}
	_setValueOverride(k, fn) {
		if(!this.hasOwnProperty(k)) {
			throw new Error(
				`Property '${k}' is not defined for ${this.constructor.name}`
			);
		}

		if(typeof fn !== "function") {
			return delete this._valueOverrides[k];
		}
		this._valueOverrides[k] = fn;
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

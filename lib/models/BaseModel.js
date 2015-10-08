"use strict";

class BaseModel {
	constructor(base, def) {
		for (var k in base) {
			this[k] = (def && def[k]) || base[k];
		}
		Object.freeze(this);
	}
	merge(def) {
		if(!def) {
			return this;
		}
		let merged = {};
		for(let k in this) {
			merged[k] = this[k];
		}
		for(let k in def) {
			if(def[k]) {
				merged[k] = def[k];
			}
		}
		return (def instanceof BaseModel ? new def.constructor(merged) : merged);
	}
}

module.exports = BaseModel;

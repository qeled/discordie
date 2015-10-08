"use strict";

const Utils = require("../core/Utils");

class ICollectionBase {
	constructor(descriptor) {
		if(!descriptor.valuesGetter)
			throw new Error("valuesGetter is not defined");
		if(!descriptor.itemFactory)
			throw new Error("itemFactory is not defined");

		this._valuesGetter = descriptor.valuesGetter;
		this._itemFactory = descriptor.itemFactory;
		this._cache = new WeakMap();
		Utils.privatify(this);
	}
	_getOrCreateInterface(item) {
		if(!this._cache.get(item))
			this._cache.set(item, this._itemFactory(item.id));
		return this._cache.get(item);
	}

	getBy(key, value) {
		for(let item of this._valuesGetter()) {
			if(item[key] != value) continue;
			return this._getOrCreateInterface(item);
		}
	}
	get(id) { return this.getBy("id", id); }
	*[Symbol.iterator]() {
		for(let item of this._valuesGetter()) {
			yield this._getOrCreateInterface(item);
		}
	}

	_getRawItemBy(key, value) {
		for(let item of this._valuesGetter()) {
			if(item[key] != value) continue;
			return item;
		}
	}
	*_getRawIterator() {
		for(let item of this._valuesGetter()) {
			yield item;
		}
	}
	_getRaw(id) { return this._getRawItemBy("id", id); }

	filter(condition) {
		if (typeof condition !== "function") {
			throw new TypeError("condition is not a function");
		}
		const items = [];
		for(let item of this) {
			if(condition(item))
				items.push(item);
		}
		return items;
	}
	concat(collection) {
		if (collection == null) {
			throw new TypeError("collection is null or not defined");
		}
		if(typeof collection.filter !== "function") {
			throw new TypeError();
		}
		collection = collection.filter(() => true);
		return this.filter(() => true).concat(collection);
	}
	find(condition) {
		if (typeof condition !== "function") {
			throw new TypeError("condition is not a function");
		}
		for(let item of this) {
			if(condition(item))
				return item;
		}
		return null;
	}
	forEach(fn) {
		if (typeof fn !== "function") {
			throw new TypeError("fn is not a function");
		}
		for(let item of this) {
			if(fn(item))
				return;
		}
	}
	map(fn) {
		if (typeof fn !== "function") {
			throw new TypeError("fn is not a function");
		}
		const items = [];
		for(let item of this) {
			items.push(fn(item));
		}
		return items;
	}
	//_conditionalIterator(condition) {
	//	return (function*() {
	//		for(let rawItem of this._getRawIterator()) {
	//			if(condition(rawItem))
	//				yield rawItem;
	//		}
	//	}).bind(this);
	//}

	toArray() {
		const array = [];
		for(let item of this) {
			array.push(item);
		}
		return array;
	}
	toJSON() { return this.toArray(); }
	get length() { return this.toArray().length; }
	get size() { return this.length }
}

module.exports = ICollectionBase;

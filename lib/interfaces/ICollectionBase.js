"use strict";

const Utils = require("../core/Utils");

class ICollectionBase {
  constructor(descriptor) {
    if (!descriptor.valuesGetter)
      throw new Error("valuesGetter is not defined");
    if (!descriptor.itemFactory)
      throw new Error("itemFactory is not defined");

    this._valuesGetter = descriptor.valuesGetter;
    this._valueGetter = descriptor.valueGetter;
    this._itemFactory = descriptor.itemFactory;
    this._cache = new WeakMap();
    Utils.privatify(this);
  }
  _getOrCreateInterface(item, customItemFactory) {
    var factory = customItemFactory || this._itemFactory;
    var cache = this._cache;
    if (!cache.get(item))
      cache.set(item, factory(item.id));
    return cache.get(item);
  }

  /**
   * Returns an an element, if `key` of an element in the collection
   * with exact `value` can be found.
   * Otherwise null is returned.
   * @param key
   * @param value
   * @returns {*}
   */
  getBy(key, value) {
    if (key === "id" && this._valueGetter) {
      var item = this._valueGetter(value);
      if (!item) return null;
      return this._getOrCreateInterface(item);
    }

    for (var item of this._valuesGetter()) {
      if (item[key] != value) continue;
      return this._getOrCreateInterface(item);
    }

    return null;
  }

  /**
   * Returns an element with requested `id`, if exists in the collection.
   * Otherwise null is returned.
   * @param {String} id
   * @returns {*}
   */
  get(id) { return this.getBy("id", id); }

  *[Symbol.iterator]() {
    for (var item of this._valuesGetter()) {
      yield this._getOrCreateInterface(item);
    }
  }

  _getRawItemBy(key, value) {
    for (var item of this._valuesGetter()) {
      if (item[key] != value) continue;
      return item;
    }
  }
  *_getRawIterator() {
    for (var item of this._valuesGetter()) {
      yield item;
    }
  }
  _getRaw(id) { return this._getRawItemBy("id", id); }

  /**
   * Creates a new array with all elements that pass the test implemented
   * by the provided function.
   * @param {Function} fn - Function with signature fn(item)
   * @returns {Array}
   */
  filter(condition) {
    if (typeof condition !== "function") {
      throw new TypeError("condition is not a function");
    }
    const items = [];
    for (var item of this) {
      if (condition(item))
        items.push(item);
    }
    return items;
  }
  concat(collection) {
    if (collection == null) {
      throw new TypeError("collection is null or not defined");
    }
    if (typeof collection.filter !== "function") {
      throw new TypeError();
    }
    collection = collection.filter(() => true);
    return this.filter(() => true).concat(collection);
  }

  /**
   * Returns a value in the collection, if an element in the collection
   * satisfies the provided testing function. Otherwise null is returned.
   * @param {Function} fn - Function with signature fn(item)
   * @returns {Object|null}
   */
  find(condition) {
    if (typeof condition !== "function") {
      throw new TypeError("condition is not a function");
    }
    for (var item of this) {
      if (condition(item))
        return item;
    }
    return null;
  }

  /**
   * Executes a provided function once per element.
   * @param {Function} fn - Function with signature fn(item)
   */
  forEach(fn) {
    if (typeof fn !== "function") {
      throw new TypeError("fn is not a function");
    }
    for (var item of this) {
      fn(item);
    }
  }

  /**
   * Creates a new array with the results of calling a provided function on
   * every element in this collection.
   * @param {Function} fn - Function with signature fn(item)
   * @returns {Array}
   */
  map(fn) {
    if (typeof fn !== "function") {
      throw new TypeError("fn is not a function");
    }
    const items = [];
    for (var item of this) {
      items.push(fn(item));
    }
    return items;
  }

  inspect() {
    var copy = new (
      // create fake object to preserve class name
      new Function("return function " + this.constructor.name + "(){}")()
    );
    copy.length = this.length;
    return copy;
  }

  /**
   * Creates a new array with elements of this collection.
   * @returns {Array}
   */
  toArray() {
    const array = [];
    for (var item of this) {
      array.push(item);
    }
    return array;
  }
  toJSON() { return this.toArray(); }

  /**
   * Number of elements in this collection.
   * @returns {Number}
   * @readonly
   */
  get length() {
    var i = 0;
    for (var item of this._valuesGetter()) i++;
    return i;
  }

  /**
   * Number of elements in this collection. Alias for `.length`.
   * @returns {Number}
   * @readonly
   */
  get size() { return this.length; }
}

module.exports = ICollectionBase;

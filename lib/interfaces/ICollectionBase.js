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
  _getOrCreateInterface(item) {
    var cache = this._cache;
    if (!cache.get(item))
      cache.set(item, this._itemFactory(item.id));
    return cache.get(item);
  }

  /**
   * Returns an element in the collection, if `key` of an element
   * in the collection matches exact `value`.
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

    for (let item of this._valuesGetter()) {
      if (item[key] != value) continue;
      return this._getOrCreateInterface(item);
    }

    return null;
  }

  /**
   * Returns an element in the collection, if id of an element matches `value`.
   * Otherwise null is returned.
   * @param {String} id
   * @returns {*}
   */
  get(id) { return this.getBy("id", id); }

  *[Symbol.iterator]() {
    for (let item of this._valuesGetter()) {
      yield this._getOrCreateInterface(item);
    }
  }

  _getRawItemBy(key, value) {
    for (let item of this._valuesGetter()) {
      if (item[key] != value) continue;
      return item;
    }
  }
  *_getRawIterator() {
    for (let item of this._valuesGetter()) {
      yield item;
    }
  }
  _getRaw(id) { return this._getRawItemBy("id", id); }

  /**
   * Creates a new array with all elements that pass the test implemented
   * by the provided function.
   * @param {Function} fn - function with signature fn(item)
   * @returns {Array}
   */
  filter(condition) {
    if (typeof condition !== "function") {
      throw new TypeError("condition is not a function");
    }
    const items = [];
    for (let item of this) {
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
   * @param {Function} fn - function with signature fn(item)
   * @returns {Object|null}
   */
  find(condition) {
    if (typeof condition !== "function") {
      throw new TypeError("condition is not a function");
    }
    for (let item of this) {
      if (condition(item))
        return item;
    }
    return null;
  }

  /**
   * Executes a provided function once per element.
   * @param {Function} fn - function with signature fn(item)
   */
  forEach(fn) {
    if (typeof fn !== "function") {
      throw new TypeError("fn is not a function");
    }
    for (let item of this) {
      if (fn(item))
        return;
    }
  }

  /**
   * Creates a new array with the results of calling a provided function on
   * every element in this collection.
   * @param {Function} fn - function with signature fn(item)
   * @returns {Array}
   */
  map(fn) {
    if (typeof fn !== "function") {
      throw new TypeError("fn is not a function");
    }
    const items = [];
    for (let item of this) {
      items.push(fn(item));
    }
    return items;
  }
  //_conditionalIterator(condition) {
  //  return (function*() {
  //    for (let rawItem of this._getRawIterator()) {
  //      if (condition(rawItem))
  //        yield rawItem;
  //    }
  //  }).bind(this);
  //}

  /**
   * Creates a new array with elements of this collection.
   * @returns {Array}
   */
  toArray() {
    const array = [];
    for (let item of this) {
      array.push(item);
    }
    return array;
  }
  toJSON() { return this.toArray(); }

  /**
   * Number of elements in this collection.
   * @returns {Number}
   */
  get length() {
    let i = 0;
    for (let item of this._valuesGetter()) i++;
    return i;
  }

  /**
   * Number of elements in this collection.
   * @returns {Number}
   */
  get size() { return this.length; }
}

module.exports = ICollectionBase;

"use strict";

function findKeyInsertionPoint(array, element, start, end) {
  if (start === undefined) start = 0;
  if (end === undefined) end = array.length;

  var min = start, max = end;
  while (true) {
    var k = ((min + max) / 2) | 0;
    if (k > end || min === max) break;

    var result = (+element) - (+array[k]);
    if (result === 0) break;
    else if (result > 0) min = k + 1;
    else if (result < 0) max = k;
  }

  return k;
}

class LimitedCache {
  constructor(limit) {
    this._keys = [];
    Object.defineProperty(this, "_keys", { enumerable: false });
    this._map = new Map;
    this.setLimit(limit);
  }
  setLimit(limit) {
    this.limit = limit || 1000;
    if (!(this.limit > 0)) this.limit = 1;
    return this.trim();
  }
  trim() {
    var keys = this._keys;
    if (keys.length <= this.limit) return null;
    var removed = keys.splice(0, keys.length - this.limit);
    for (var i = 0; i < removed.length; i++)
      this._map.delete(removed[i]);
    return removed;
  }
  set(k, v) {
    if (!this._map.has(k)) {
      this._keys.splice(findKeyInsertionPoint(this._keys, k), 0, k);
      this.trim();
    }
    return this._map.set(k, v);
  }
  rename(from, to) {
    var i = this._keys.indexOf(from);
    if (i >= 0) {
      this._keys.splice(i, 1);
      this._keys.splice(findKeyInsertionPoint(this._keys, to), 0, to);
    }
    if (this._map.has(from)) {
      this._map.set(to, this._map.get(from));
      this._map.delete(from);
    }
  }
  delete(k) {
    if (this._map.delete(k)) {
      var i = this._keys.indexOf(k);
      if (i >= 0) this._keys.splice(i, 1);
      return true;
    }
    return false;
  }
  clear() {
    this._keys.length = 0;
    return this._map.clear();
  }
  forEach(fn) { return this._map.forEach(fn); }
  values() { return this._map.values(); }
  entries() { return this._map.entries(); }
  keys() { return this._map.keys(); }
  get(k) { return this._map.get(k); }
  has(k) { return this._map.has(k); }
  get size() { return this._map.size; }

  map(fn) {
    if (typeof fn !== "function") {
      throw new TypeError("fn is not a function");
    }
    if (!this._keys.length) return [];
    var items = [];
    for (var i = 0, len = this._keys.length; i < len; i++) {
      var item = this.get(this._keys[i]);
      items.push(fn(item));
    }
    return items;
  }
}

module.exports = LimitedCache;

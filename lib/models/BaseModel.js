"use strict";

class BaseModel {
  constructor(base, def) {
    for (let k in base) {
      this[k] = ((def && def.hasOwnProperty(k)) ? def[k] : base[k]);
    }
    Object.freeze(this);
  }
  merge(def) {
    if (!def) {
      return this;
    }
    let merged = {};
    for (let k in this) {
      merged[k] = this[k];
    }
    for (let k in def) {
      if (merged.hasOwnProperty(k)) {
        merged[k] = def[k];
      }
    }
    return new this.constructor(merged);
  }
}

module.exports = BaseModel;

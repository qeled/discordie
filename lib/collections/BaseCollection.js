"use strict";

const BaseModel = require("../models/BaseModel");

class BaseCollection extends Map {
  constructor() {
    super();
  }
  mergeOrSet(key, value) {
    const old = this.get(key);
    let merged = value;
    if (old && old instanceof BaseModel) {
      merged = old.merge(value);
    }
    this.set(key, merged);
  }
}

module.exports = BaseCollection;

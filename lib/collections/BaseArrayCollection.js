"use strict";

class BaseArrayCollection extends Array {
  // avoid constructor, calling array mutation methods will call it (ES2015)
  static create() {
    const instance = new this();
    this._constructor.apply(instance, arguments);
    return instance;
  }
}

module.exports = BaseArrayCollection;

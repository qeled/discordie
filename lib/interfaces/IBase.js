"use strict";

const Utils = require("../core/Utils");

class IBase {
  constructor(proto, get) {
    this._valueOverrides = {};
    this._gettersByProperty = {};
    this._getter = get;
    this._inherit(proto, get);
    this._suppressErrors = false;
  }
  _inherit(proto, get) {
    const interfacingProperties = new proto();
    for (let key in interfacingProperties) {
      this._gettersByProperty[key] = true;
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get: () => {
          try {
            const value = get(key);
            if (this._valueOverrides[key]) {
              return this._valueOverrides[key](value);
            }
            return value;
          } catch (e) {
            if (!this._suppressErrors) console.error(e.stack);
            return null;
          }
        }
      });
    }
  }
  _setValueOverride(k, fn) {
    if (!this.hasOwnProperty(k)) {
      throw new Error(
        `Property '${k}' is not defined for ${this.constructor.name}`
      );
    }

    if (typeof fn !== "function") {
      return delete this._valueOverrides[k];
    }
    this._valueOverrides[k] = fn;
  }
  getRaw() {
    const copy = {};
    for (let key in this) {
      try {
        if (this._gettersByProperty.hasOwnProperty(key))
          copy[key] = this._getter(key);
      } catch (e) {
        copy[key] = null;
        console.error("Could not get key ", key);
        console.error(e.stack);
      }
    }
    return copy;
  }

  get _valid() {
    try {
      return this._getter("id");
    } catch (e) {
      return false;
    }
  }

  valueOf() {
    if (!this.id) return null;
    return this.id;
  }
  equals(b) {
    return this.valueOf() === b.valueOf();
  }

  /**
   * Gets date and time this object was created at.
   * @returns {Date}
   * @readonly
   */
  get createdAt() {
    return new Date(Utils.timestampFromSnowflake(this.id));
  }
}

module.exports = IBase;

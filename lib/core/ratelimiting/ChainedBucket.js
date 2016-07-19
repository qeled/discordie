"use strict";

const Bucket = require("./Bucket");

class ChainedBucket extends Bucket {
  constructor(size, duration, name, parent) {
    super(size, duration);
    this.parent = parent || null;
    this.name = name || null;
  }
  refillByName(name) {
    if (this.parent) this.parent.refillByName(name);
    if (this.name && this.name.indexOf(name) === 0) this.refill();
  }
  get waitingBucket() {
    if (this.parent && this.parent.available <= 0)
      return this.parent;
    if (this.available <= 0)
      return this;
    return null;
  }
  get available() {
    // this getter triggers refill
    const availableParent = this.parent && this.parent.available;
    const availableSelf = super.available;
    if (this.parent && availableParent <= 0)
      return availableParent;
    return availableSelf;
  }
  consume(n) {
    // this triggers 'available' getter which triggers refill
    if (this.parent) {
      return super.consume(n) && this.parent.consume(n);
    }
    return super.consume(n);
  }
}

module.exports = ChainedBucket;
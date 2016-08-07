"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

/**
 * @kind model
 * @alias Call
 */
const BaseCall = {
  /** @returns {String|null} */
  channel_id: null,
  /** @returns {String|null} */
  message_id: null,
  /** @returns {String|null} */
  region: null,
  /** @returns {Array<String>|null} */
  ringing: [],
  /** @returns {boolean|null} */
  unavailable: false
};

class Call extends BaseModel {
  constructor(def) {
    super(BaseCall, def);
  }
}

module.exports = Call;

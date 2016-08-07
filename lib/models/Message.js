"use strict";

const Constants = require("../Constants");
const MessageTypes = Constants.MessageTypes;
const BaseModel = require("./BaseModel");

/**
 * @kind model
 * @alias Message
 */
const BaseMessage = {
  /** @returns {String|null} */
  id: null,
  /** @returns {Number|null} */
  type: MessageTypes.DEFAULT,
  /** @returns {String|null} */
  channel_id: null,
  /** @returns {User|null} */
  author: null,
  /** @returns {String|null} */
  content: "",
  /** @returns {Array|null} */
  attachments: [],
  /** @returns {Array|null} */
  embeds: [],
  /** @returns {Array|null} */
  mentions: [],
  /** @returns {Array|null} */
  mention_roles: [],
  /** @returns {boolean|null} */
  mention_everyone: false,
  /** @returns {boolean|null} */
  tts: false,
  /** @returns {String|null} */
  timestamp: "",
  /** @returns {String|null} */
  edited_timestamp: null,
  /** @returns {String|null} */
  nonce: null,
  /** @returns {boolean|null} */
  pinned: false,
  /**
   * Raw MessageCall object:
   *
   * ```js
   * {
   *   // Array of user ids participating in this call,
   *   // only used to check if the call was missed
   *   participants: [ "108721394061205504" ], // Array<String>
   *
   *   // Timestamp when call ended, null if call is in progress
   *   ended_timestamp: "2016-07-24T06:52:11.860000+00:00" // String | null
   * }
   * ```
   * @returns {Object|null}
   * @memberOf IMessage
   * @readonly
   * */
  call: null,

  /** @returns {boolean|null} */
  deleted: false // for clientside cache
};

class Message extends BaseModel {
  constructor(def) {
    super(BaseMessage, def);
  }
}

module.exports = Message;

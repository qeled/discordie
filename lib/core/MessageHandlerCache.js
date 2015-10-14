"use strict";

const Constants = require("../Constants");

const discordie = new WeakMap();

const messageHandlerCache = {};
function processMessage(source, socket, type, data) {
  if (messageHandlerCache[`${source}/${type}`]) {
    if (typeof messageHandlerCache[`${source}/${type}`] === "function")
      return messageHandlerCache[`${source}/${type}`].apply(this, [data, socket]);
    return false;
  }

  let messageHandler = null;

  const modulePath =
    `../networking/messages/${source}/${type.toLowerCase()}`;

  try {
    messageHandler = require(modulePath);
  } catch (e) {
    if (e.code != "MODULE_NOT_FOUND")
      throw e;
  }

  if (messageHandler) {
    messageHandlerCache[`${source}/${type}`] = messageHandler;
    return processMessage.apply(this, arguments);
  }
}

class MessageHandlerCache {
  constructor(_discordie) {
    discordie.set(this, _discordie);
  }

  processVoiceMessage(socket, type, data) {
    return processMessage.call(discordie.get(this),
      "voice", socket, type, data
    );
  }
  processGatewayMessage(socket, type, data) {
    return processMessage.call(discordie.get(this),
      "gateway", socket, type, data
    );
  }
}

module.exports = MessageHandlerCache;

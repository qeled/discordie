"use strict";

const handlers = require("requireindex")(__dirname);

function bindHandlers(discordie, root) {
  var root = Object.assign({}, root);
  for (let k in root) {
    if (!root.hasOwnProperty(k)) continue;
    if (typeof root[k] === "function") {
      root[k] = root[k].bind(discordie);
    } else {
      root[k] = bindHandlers(discordie, root[k]);
    }
  }
  return root;
}

module.exports = function(discordie) {
  return bindHandlers(discordie, handlers);
};

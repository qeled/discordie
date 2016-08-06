"use strict";

function loadHandlers() {
  // webpack build:
  if (process.browser) {
    const writeModule = (root, path, module) => {
      const child = path.shift();
      if (path.length) {
        root[child] = root[child] || {};
        return writeModule(root[child], path, module);
      }
      root[child] = module;
    };

    const ctx = require.context("./", true, /\.js$/);
    const handlers = {};
    ctx.keys().forEach(key => {
      if (key.match(/index\.js$/)) return;
      const path = key
        .replace(/\.js$/, "")
        .replace(/^\.[\/\\]/, "")
        .split(/[\/\\]/g);
      writeModule(handlers, path, ctx(key));
    });
    return handlers;
  }

  // regular node:
  return require("requireindex")(__dirname);
}

const handlers = loadHandlers();

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

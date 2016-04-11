"use strict";

const casList = [
  "addtrustexternalcaroot.crt",
  "comodorsaaddtrustca.crt",
  "comodorsadomainvalidationsecureserverca.crt"
];

function addCA(path) {
  var opts = require('https').globalAgent.options;
  opts.ca = opts.ca || [];
  opts.ca.push(require('fs').readFileSync(require('path').resolve(path)));
}

casList.forEach(ca => addCA(__dirname + "/../../deps/cas/" + ca));

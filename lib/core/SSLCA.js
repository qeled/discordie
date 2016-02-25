"use strict";

const casList = [
  "addtrustexternalcaroot.crt",
  "comodorsaaddtrustca.crt",
  "comodorsadomainvalidationsecureserverca.crt"
];
const cas = require("ssl-root-cas").inject();
casList.forEach((ca) => {
  cas.addFile(__dirname + "/../../deps/cas/" + ca);
});

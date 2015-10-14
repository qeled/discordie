"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

const BasePermissionOverwrite = {
  id: null,
  type: null,
  allow: 0,
  deny: 0
};

class PermissionOverwrite extends BaseModel {
  constructor(def) {
    super(BasePermissionOverwrite, def);
  }
}

module.exports = PermissionOverwrite;

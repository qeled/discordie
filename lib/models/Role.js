"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

const BaseRole = {
  id: null,
  name: null,
  permissions: 0,
  position: -1,
  hoist: false,
  color: 0,
  managed: false
};

class Role extends BaseModel {
  constructor(def) {
    super(BaseRole, def);
  }
}

module.exports = Role;

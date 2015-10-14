"use strict";

const Constants = require("../Constants");
const BaseModel = require("./BaseModel");

const BaseRole = {
  id: null,
  name: null,
  permissions: 0,
  position: -1,
  hoist: false,
  color: 0
};

class Role extends BaseModel {
  constructor(def) {
    super(BaseRole, def);
  }
}

module.exports = Role;

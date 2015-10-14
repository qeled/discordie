"use strict";

const ICollectionBase = require("./ICollectionBase");
const IGuild = require("./IGuild");
const Utils = require("../core/Utils");

const rest = require("../networking/rest");

class IGuildCollection extends ICollectionBase {
  constructor(discordie, valuesGetter) {
    super({
      valuesGetter: valuesGetter,
      itemFactory: (id) => new IGuild(this._discordie, id)
    });
    this._discordie = discordie;
    Utils.privatify(this);
  }

  create(name, region, icon) {
    return new Promise((rs, rj) => {
      rest(this._discordie).guilds.createGuild(name, region, icon)
      .then((guild) => rs(this._discordie.Guilds.get(guild.id)))
      .catch (rj);
    });
  }

  fetchRegions() {
    return rest(this._discordie).voice.getRegions();
  }
}

module.exports = IGuildCollection;

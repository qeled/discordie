"use strict";

const ICollectionBase = require("./ICollectionBase");
const IGuild = require("./IGuild");
const Utils = require("../core/Utils");

const rest = require("../networking/rest");

/**
 * @interface
 * @extends ICollectionBase
 */
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
      .then(guild => rs(this._discordie.Guilds.get(guild.id)))
      .catch(rj);
    });
  }

  /**
   * Makes a request to get a default list of voice regions.
   * Use IGuild.fetchRegions for getting guild-specific list.
   * @returns {Promise<Array<Object>, Error>}
   */
  fetchRegions() {
    return rest(this._discordie).voice.getRegions();
  }
}

module.exports = IGuildCollection;

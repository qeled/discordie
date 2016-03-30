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
  constructor(discordie, valuesGetter, valueGetter) {
    super({
      valuesGetter: valuesGetter,
      valueGetter: valueGetter,
      itemFactory: (id) => new IGuild(this._discordie, id)
    });
    this._discordie = discordie;
    Utils.privatify(this);
  }

  /**
   * Makes a request to create a guild.
   * @param {String} name
   * @param {String} region
   * @param {Buffer|null} [icon]
   * @returns {Promise<IGuild, Error>}
   */
  create(name, region, icon) {
    if (icon instanceof Buffer) {
      icon = Utils.imageToDataURL(icon);
    }

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

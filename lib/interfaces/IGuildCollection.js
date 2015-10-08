"use strict";

const ICollectionBase = require("./ICollectionBase");
const IGuild = require("./IGuild");
const Utils = require("../core/Utils");

class IGuildCollection extends ICollectionBase {
	constructor(discordie, valuesGetter) {
		super({
			valuesGetter: valuesGetter,
			itemFactory: (id) => new IGuild(this._discordie, id)
		});
		this._discordie = discordie;
		Utils.privatify(this);
	}

	create() {
	}
}

module.exports = IGuildCollection;

"use strict";

const ICollectionBase = require("./ICollectionBase");
const IDirectMessageChannel = require("./IDirectMessageChannel");
const Utils = require("../core/Utils");
const Constants = require("../Constants");
const ChannelTypes = Constants.ChannelTypes;

class IDirectMessageChannelCollection extends ICollectionBase {
	constructor(discordie, valuesGetter) {
		super({
			valuesGetter: valuesGetter,
			itemFactory: (id) => new IDirectMessageChannel(this._discordie, id)
		});
		this._discordie = discordie;
		Utils.privatify(this);
	}
	open(recipientId) {
		const userId = this._discordie.User.id;
		return new Promise((rs, rj) => {
			rest(this._discordie).channels.createDirectMessageChannel(userId, recipientId)
			.then((channel) => rs(this._discordie.Channels.get(channel.id)))
			.catch(rj);
		});
	}
}

module.exports = IDirectMessageChannelCollection;

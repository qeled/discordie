"use strict";

const ICollectionBase = require("./ICollectionBase");
const IMessage = require("./IMessage");
const IChannel = require("./IChannel");
const Utils = require("../core/Utils");

class IMessageCollection extends ICollectionBase {
	constructor(discordie, valuesGetter) {
		super({
			valuesGetter: valuesGetter,
			itemFactory: (id) => new IMessage(this._discordie, id)
		});
		this._discordie = discordie;
		Utils.privatify(this);
	}
	forChannel(channelId) {
		if(channelId instanceof IChannel || (channelId && channelId.id))
			channelId = channelId.id;

		return this.filter((message) => message.channel_id == channelId)
			.sort((a, b) =>
				new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
			);
		//return new IChannelCollection(this._discordie,
		//	this._conditionalIterator((message) => message.channel_id == channelId)
		//);
	}
}

module.exports = IMessageCollection;

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(userId, recipientId) {
	return new Promise((rs, rj) => {
		apiRequest
		.post(Endpoints.USER_CHANNELS(userId))
		.auth(this.token)
		.send({recipient_id: recipientId})
		.end((err, res) => {
			if(res.ok) {
				this._channels.mergeOrSet(res.body.id, res.body);
				return rs(res.body);
			}
			rj(err);
		});
	});
}

const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

// must specify 'filename' with image extension for image embeds
// if passing a Buffer or Stream into 'readStream'
module.exports = function(channelId, readStream, filename) {
	return new Promise((rs, rj) => {
		apiRequest
		.post(Endpoints.MESSAGES(channelId))
		.auth(this.token)
		.attach("file", readStream, filename)
		.end((err, res) => {
			if(!res.ok)
				return rj(err, res);

			this._messages.update(res.body);
			rs(res.body);
		});
	});
}

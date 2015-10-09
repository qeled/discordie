const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(name, region, icon) {
	icon = icon || null;

	return new Promise((rs, rj) => {
		apiRequest
		.post(Endpoints.GUILDS)
		.auth(this.token)
		.send({
			name: name,
			region: region,
			icon: icon
		})
		.end((err, res) => {
			if(!res.ok)
				return rj(err, res);

			this._guilds.mergeOrSet(res.body.id, res.body);
			rs(res.body);
		});
	});
}

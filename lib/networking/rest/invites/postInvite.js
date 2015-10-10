const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(code) {
	return new Promise((rs, rj) => {
		apiRequest
		.post(`${Endpoints.INVITE}/${code}`)
		.auth(this.token)
		.end((err, res) => {
			if(!res.ok)
				return rj(err);

			// todo: invite collection handling
			rs();
		});
	});
}

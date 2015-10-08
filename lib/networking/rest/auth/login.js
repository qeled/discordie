const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(auth) {
	return new Promise((rs, rj) => {
		apiRequest
		.post(Endpoints.LOGIN)
		.send(auth)
		.end((err, res) => {
			if(err) {
				this.Dispatcher.emit(
					Events.REQUEST_AUTH_LOGIN_ERROR,
					{error: err}
				);
				return rj(err, res);
			}
			this.Dispatcher.emit(
				Events.REQUEST_AUTH_LOGIN_SUCCESS,
				{token: res.body.token, password: auth.password}
			);
			rs();
		});
	});
}

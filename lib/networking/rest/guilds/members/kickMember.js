const Constants = require("../../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../../core/ApiRequest");

module.exports = function(guildId, userId) {
	return new Promise((rs, rj) => {
		apiRequest
		.del(`${Endpoints.GUILD_MEMBERS(guildId)}/${userId}`)
		.auth(this.token)
		.end((err, res) => {
			return res.ok ? rs() : rj(err, res);
		});
	});
}

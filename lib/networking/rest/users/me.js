const Constants = require("../../../Constants");
const Events = Constants.Events;
const Endpoints = Constants.Endpoints;
const apiRequest = require("../../../core/ApiRequest");

module.exports = function(username, avatar, email, newPassword) {
	const user = this._user;
	username = (typeof username === "undefined" ? user.username : username);
	avatar = (typeof avatar === "undefined" ? user.avatar : avatar);
	email = (typeof email === "undefined" ? user.email : email);
	newPassword = (typeof newPassword === "undefined" ? null : newPassword);
	return new Promise((rs, rj) => {
		apiRequest
		.patch(Endpoints.ME)
		.send({
			username: username,
			email: email,
			password: this._password,
			avatar: avatar,
			new_password: newPassword
		})
		.end((err, res) => {
			if(!res.ok)
				return rj(err);

			this.token = res.body.token;
			this._password = newPassword;
			this._users.updateAuthenticatedUser(res.body);
			rs();
		});
	});
}

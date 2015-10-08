const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, socket) {
	if(this.User.id != data.user.id) {
		this.Dispatcher.emit(Events.PRESENCE_UPDATE, {
			socket: socket,
			user: this.Users.get(data.user.id)
		});
	}
	return true;
};

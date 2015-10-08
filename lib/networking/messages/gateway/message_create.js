const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, socket) {
	this.Dispatcher.emit(Events.MESSAGE_CREATE, {
		socket: socket,
		message: this.Messages.get(data.id)
	});
	return true;
};

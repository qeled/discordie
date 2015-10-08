const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, socket) {
	this.Dispatcher.emit(Events.MESSAGE_UPDATE, {
		socket: socket,
		message: this.Messages.get(data.id)
	});
	return true;
};

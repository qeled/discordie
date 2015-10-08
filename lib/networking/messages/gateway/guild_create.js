const Constants = require("../../../Constants");
const Events = Constants.Events;

module.exports = function handler(data, socket) {
	if(data.unavailable)
		this.Dispatcher.emit(Events.GUILD_UNAVAILABLE, {socket: socket, guildId: data.id});
	return true;
};

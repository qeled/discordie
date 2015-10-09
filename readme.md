# Discordie

A Node.js module providing a set of interfaces to interact with Discord API.

**Requires at least Node.js 4.0.0.**

## WIP

This module is in development. Things MAY and WILL break.

You might consider using these instead:

##### .NET:
[Discord.Net](https://github.com/RogueException/Discord.Net)

[DiscordSharp](https://github.com/Luigifan/DiscordSharp)

##### Node.js
[discord.io](https://github.com/izy521/node-discord)

[discord.js](https://github.com/hydrabolt/discord.js)

##### Java:
[Discord4J](https://github.com/nerd/Discord4J)

##### Python
[discord.py](https://github.com/Rapptz/discord.py)

##### Ruby
[discordrb](https://github.com/meew0/discordrb)


## Example

```js
var Discordie = require("discordie");

var auth = {
	email: "discordie@example.com",
	password: ""
};

var client = new Discordie();

function connect() { client.connect(auth); }
connect();

client.Dispatcher.on(Discordie.Events.DISCONNECTED, (e) => {
	console.log("Reconnecting");
	setTimeout(connect, 5000);
});

client.Dispatcher.on(Discordie.Events.GATEWAY_READY, (e) => {
	console.log("Connected as: " + client.User.username);
});

client.Dispatcher.on(Discordie.Events.MESSAGE_CREATE, (e) => {
	console.log("new message: ");
	console.log(JSON.stringify(e.message, null, "  "));

	if(e.message.content == "ping") {
		e.message.channel.sendMessage("pong");
	}
});
```

## TODO

* Invites
* User management API
* Roles and permissions
* Ban management
* Member pruning
* Account creation
* Voice decoding
* WebRTC transport implementation (?)

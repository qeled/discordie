# Discordie

A Node.js module providing a set of interfaces to interact with Discord API.

**Requires at least Node.js 4.0.0.**

Join [#node_discordie](https://discord.gg/0SBTUU1wZTWO5NWd) in [Discord API](https://discord.gg/0SBTUU1wZTWO5NWd).

## Fully Implemented

* Messaging
* Role and channel permission management API
* Member management API (kicking, banning, etc.)
* Direct messages
* Voice encoding, sending, decoding and receiving
(audio streaming example: [`examples/massive.js`](https://github.com/qeled/discordie/blob/master/examples/massive.js))
* Local user profile (username change, statuses, avatars)
* Multiserver voice support

## Mostly Implemented

* Guild (server) and channel management API
 * No guild info editing yet

## Planned

* Stream interfaces

## Documentation

Currently only inline documentation in files:
* `lib/interfaces/*.js`
* `lib/models/*.js`
* `lib/index.js`

## Example

```js
var Discordie = require("discordie");
var Events = Discordie.Events;

var auth = {
  email: "discordie@example.com",
  password: ""
};

var client = new Discordie();

function connect() { client.connect(auth); }
connect();

client.Dispatcher.on(Events.DISCONNECTED, (e) => {
  console.log("Reconnecting");
  setTimeout(connect, 5000);
});

client.Dispatcher.on(Events.GATEWAY_READY, (e) => {
  console.log("Connected as: " + client.User.username);
});

client.Dispatcher.on(Events.MESSAGE_CREATE, (e) => {
  console.log("new message: ");
  console.log(JSON.stringify(e.message, null, "  "));

  if (e.message.content == "ping") {
    e.message.channel.sendMessage("pong");
  }
});
```

## Links

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


## TODO

* Stream interfaces for voice
* Guild editing
* Partial object diffs on some events (?)
* Account creation (?)
* WebRTC transport implementation (?)


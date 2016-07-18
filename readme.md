# Discordie

[![npm](https://img.shields.io/npm/dm/discordie.svg)](https://www.npmjs.com/package/discordie)

A Node.js module providing a set of interfaces to interact with Discord API.

[**Documentation**](http://qeled.github.io/discordie/)

**Requires at least Node.js 4.0.0.**

**No native modules required to work with audio. Choose from precompiled (default) or `node-opus` (optional).**

Join [#node_discordie](https://discord.gg/0SBTUU1wZTYM8nHo) in [Discord API](https://discord.gg/0SBTUU1wZTYM8nHo).

## Fully Implemented

* Messaging
* Role and channel permission management API
* Member management API (kicking, banning, etc.)
* Direct messages
* Voice encoding, sending, decoding and receiving
(audio streaming example: [`examples/encoderstream.js`](https://github.com/qeled/discordie/blob/master/examples/encoderstream.js))
* Guild (server) and channel management API
* Local user profile (username change, statuses, avatars)
* Multiserver voice support

## Documentation

http://qeled.github.io/discordie/

Mirrors inline documentation in files:
* `lib/interfaces/*.js`
* `lib/models/*.js`
* `lib/voice/*.js`
* `lib/Constants.js`
* `lib/index.js`

## Example

```js
var Discordie = require("discordie");
var Events = Discordie.Events;

var client = new Discordie();

client.connect({ token: "" });

client.Dispatcher.on(Events.GATEWAY_READY, e => {
  console.log("Connected as: " + client.User.username);
});

client.Dispatcher.on(Events.MESSAGE_CREATE, e => {
  if (e.message.content == "ping")
    e.message.channel.sendMessage("pong");
});
```

## Related

### Library comparison: https://discordapi.com/unofficial/comparison.html

**.NET**:
[RogueException/**Discord.Net**](https://github.com/RogueException/Discord.Net) ||
[Luigifan/**DiscordSharp**](https://github.com/Luigifan/DiscordSharp) ||
[robinhood128/**DiscordUnity**](https://github.com/robinhood128/DiscordUnity)

**Node.js**:
[izy521/**discord.io**](https://github.com/izy521/discord.io) ||
[hydrabolt/**discord.js**](https://github.com/hydrabolt/discord.js) ||
[abalabahaha/**eris**](https://github.com/abalabahaha/eris)

**Python**:
[Rapptz/**discord.py**](https://github.com/Rapptz/discord.py)

**Ruby**:
[meew0/**discordrb**](https://github.com/meew0/discordrb)

**Go**:
[bwmarrin/**discordgo**](https://github.com/bwmarrin/discordgo)

**Rust**:
[SpaceManiac/**discord-rs**](https://github.com/SpaceManiac/discord-rs)

**PHP**:
[teamreflex/**DiscordPHP**](https://github.com/teamreflex/DiscordPHP) ||
[Cleanse/**discord-hypertext**](https://github.com/Cleanse/discord-hypertext)

**Java**:
[austinv11/**Discord4J**](https://github.com/austinv11/Discord4J) ||
[DV8FromTheWorld/**JDA**](https://github.com/DV8FromTheWorld/JDA/) ||
[BtoBastian/**Javacord**](https://github.com/BtoBastian/Javacord)

**Lua**:
[SinisterRectus/**Discordia**](https://github.com/SinisterRectus/Discordia) ||
[satom99/**litcord**](https://github.com/satom99/litcord)


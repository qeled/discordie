# FAQ

---------------

## Before you ask

Make sure you've skimmed through the
[examples](https://github.com/qeled/discordie/tree/master/examples).

You can also search the documentation using the search field
on the left.

### Can I send messages outside of `MESSAGE_CREATE` event?

```js
// get a channel by id
channel = client.Channels.get(id);

// or get a channel from guild:
guild = client.Guilds.find(g => g.name == "guild name");
// guild.textChannels is an array
channel = guild.textChannels.find(c => c.name == "general");

channel.sendMessage("text");
```

### How do I check if `message` is a direct message?

See [IMessage.isPrivate](#/docs/IMessage?p=IMessage%23isPrivate).

### How do I assign roles to members?

```js
guild = client.Guilds.find(g => g.name == "guild name");
role = guild.roles.find(r => r.name == "any role name");
user = client.Users.get(userid);
member = user.memberOf(guild);

member.assignRole(role);
member.unassignRole(role);
```

## If you have any other questions or bug reports

Or if the docs for something look incomplete:

Join [#node_discordie](https://discord.gg/0SBTUU1wZTYM8nHo)
in [Discord API](https://discord.gg/0SBTUU1wZTYM8nHo).
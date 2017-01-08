# Getting Started

---------------

## Requirements

- **Node.js v4.0.0** or higher.

## Installing

Assuming you've already installed Node.js, create a directory for your
code, and install the library:

```
npm install discordie
```

---------------

> **Note:** NPM packages are released only for stable versions, try
>           using version from
>           `master` (semi-stable) or `dev` (unstable) branches
>           of the GitHub repo if you have problems or want to be
>           up to date.

Installing from `master` branch using npm (remove all previous versions
before installing):

```
npm remove discordie
npm install qeled/discordie
```

#### **Note for Windows users**

If you don't have Visual Studio with C/C++ package installed -
**optional** websocket dependencies `bufferutil` and `utf-8-validate`
will fail to compile and some errors will be shown in the console.

This is normal behavior and the library will still work.

---------------

## Getting a user token

> _**Note:**
> User token support may or may not be removed from the library
> in future._

Press `CTRL+SHIFT+I` in your browser or the desktop app to open
developer tools, switch to the `Application` tab and expand `Local Storage`
tree. Find the `token` value that looks like this:

```
"MYMzNDIzT1NjEkN5MTgT3zEz.djCoWw.rShRcJvCcmKI1hOTlJQ4lnWKMZQ"
```

Note that this method only works in the Discord desktop app and Chromium-based
browsers.

## Creating bots accounts

1. Create an [OAuth2 application](https://discordapp.com/developers/applications/me).
2. Create a bot user and grab a token.
3. Add the bot to your guild using OAuth2 authentication flow.
   Replace example id `157730590492196864` with your own.

```
https://discordapp.com/oauth2/authorize?client_id=157730590492196864&scope=bot
```

See [official API documentation](https://discordapp.com/developers/docs/topics/oauth2)
for more info.

## Example

Create a file `example.js` with the following code and run
`node example.js`.

```js
var Discordie = require("discordie");
var client = new Discordie();

client.connect({
  // replace this sample token
  token: "MYMzNDIzT1NjEkN5MTgT3zEz.djCoWw.rShRcJvCcmKI1hOTlJQ4lnWKMZQ"
});

client.Dispatcher.on("GATEWAY_READY", e => {
  console.log("Connected as: " + client.User.username);
});

client.Dispatcher.on("MESSAGE_CREATE", e => {
  if (e.message.content == "ping")
    e.message.channel.sendMessage("pong");
});
```

Additional
[examples](https://github.com/qeled/discordie/tree/master/examples)
can be found in the
[GitHub repo](https://github.com/qeled/discordie/tree/master/examples).

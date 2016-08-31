# Discordie changelog

## 2016-08-31, Version 0.8.1

  - Minor changes in rate limit bucket structure, X-RateLimit-Reset support;
  - Calling `member.unban()` on invalid member objects no longer throws;
  - Added `CHANNEL_PINNED_MESSAGE` (type 6) to `Discordie.MessageTypes`.

## 2016-08-17, Version 0.8.0

#### Breaking Discord API v6 changes:

  - Channel type is now a number, not string `"text"` and `"voice"`:
    see [`Discordie.ChannelTypes`](https://qeled.github.io/discordie/#/docs/IChannel);
  - Direct message channels now have **{Array\<IUser>}** `recipients`
    instead of **{String}** `recipient_id`, getter **{IUser}** `recipient`
    added and marked as deprecated;
  - Channel field `is_private` has been removed from the API,
    getters [`isPrivate` and `is_private`](https://qeled.github.io/discordie/#/docs/IChannel?p=IChannel%23is_private)
    added to replace it. Getter `is_private` is marked as deprecated.

#### Overview of API v6 changes:

  - New events `CALL_CREATE`, `CALL_UPDATE`, `CALL_DELETE`,
    `CHANNEL_RECIPIENT_ADD`, `CHANNEL_RECIPIENT_REMOVE`;
  - Message fields added:
    - **{Number}** `type`:
      everything other than 0 is a system message,
      see [`Discordie.MessageTypes`](https://qeled.github.io/discordie/#/docs/IMessage);
    - **{Object}** `call`: [object](http://qeled.github.io/discordie/#/docs/IMessage?p=IMessage.call)
      present if this is a system message with call info.
  - Channel fields removed:
      **{String}** `type`,
      **{Boolean}** `is_private`;
  - Channel fields added:
      **{Number}** `type`,
      **{Array<IUser>}** `recipients`,
      **{String|null}** `owner_id`,
      **{String|null}** `icon`.

#### Library changes:

  - New local events `CALL_UNAVAILABLE`, `CALL_RING`;
  - New method `IDirectMessageChannelCollection.createGroupDM()`;
  - **`IDirectMessageChannel`**:
    - New getters:
      - **{[ICall](http://qeled.github.io/discordie/#/docs/ICall)}** `call`;
      - **{Array<IUser>|null}** `usersInCall`;
      - **{IAuthenticatedUser|IUser|null}** `owner`;
      - **{String|null}** `iconURL`;
    - New methods:
      - **{Boolean}** `isOwner(user)`;
      - **{Promise}** `ring(recipients)` (user accounts only);
      - **{Promise}** `stopRinging(recipients)` (user accounts only);
      - **{Promise}** `changeCallRegion(region)` (user accounts only);
      - **{Promise}** `addRecipient(user)` (user accounts only);
      - **{Promise}** `removeRecipient(user)` (user accounts only);
      - **{Promise\<IDirectMessageChannel, Error>}** `setName(name)`;
      - **{Promise\<IDirectMessageChannel, Error>}** `setIcon(icon)`;
      - **{Promise}** `joinCall(selfMute, selfDeaf)` (user accounts only);
      - **{void}** `leaveCall()`;
      - **{VoiceConnectionInfo|null}** `getVoiceConnectionInfo()`;
      - **{Promise<ICall|null, Error>}** `fetchCall()`;
    - Marked getter `recipient` as deprecated, use `recipients` instead;
  - **`IMessage`**:
    - New getters:
      - **{Boolean|null}** `isSystem`;
      - **{String|null}** `systemMessage`;
  - `IUser.getVoiceChannel(guild)` now accepts null guild;
  - New method `IUserCollection.usersInCall(channel)`.

#### New:

  - Option to disable implicit mentions in
    `user.isMentioned(message, ignoreImplicitMentions)`;
  - Bot token header is now forced depending on account type received in
    `READY`;
  - Updated rate limits, including header support.

#### Fixed:

  - `channel.fetchMessages()` failing with Discord's new parameter validation
    (since 2016-08-11).

## 2016-08-04, Version 0.7.6

#### New:

  - Emoji field support: `IGuild.emojis`;
  - Bot application and owner info: `IAuthenticatedUser.getApplication()`.

#### Other:

  - `ICollectionBase.forEach` now doesn't stop iterating if you return a
    truthy value in the callback.

## 2016-07-29, Version 0.7.5

#### API changes:

  - New permission `General.EXTERNAL_EMOTES`.

#### New:

  - Preemptive rate limit handling: bots can now send messages as fast
    as they are allowed;
  - Collection lengths are now printed when inspected with `console.log`:
    ex. `IGuildCollection { length: 8 }`;
  - `IDirectMessageChannel` now supports fetching pinned messages.

#### Fixes:

  - Fixed rare case of voice states not syncing after gateway being `RESUMED`;
  - Fixed some promises returning strings instead of proper `Error` objects;
  - Fixed array collections crashing on latest V8 engine.

#### Other:

  - Buffers are now allocated using `Buffer.alloc`/`Buffer.from` instead of
    deprecated `Buffer` constructor whenever possible.

## 2016-07-16, Version 0.7.3

#### API changes:

  - Removed human readable invites.

#### Fixes:

  - Order of pinned messages now matches the client;
  - Upgraded `ws` dependency from v0.8.0 to v1.1.1, fixes crash on node v6.x.x;
  - Property `previousNick` in `GUILD_MEMBER_UPDATE` is now set correctly.

#### Other:

  - Changed permission (methods `IUser/IGuildMember.permissionsFor/can`)
    error message from `"Invalid user"` to
    `"User is not a member of the context"`.

## 2016-06-25, Version 0.7.2

#### New:

  - Event `GUILD_MEMBER_UPDATE` now exposes object changes:

    - **{Array\<IRole>}** `rolesAdded`;
    - **{Array\<IRole>}** `rolesRemoved`;
    - **{String|null}** `previousNick`.

  - `IAuthenticatedUser.setGame/setStatus` now also accept games as strings;

  - Message pinning support:

    - ITextChannel
      - **{Array\<IMessage>}** `ITextChannel.pinnedMessages`;
      - **{Promise\<Object, Error>}** `ITextChannel.fetchPinned()`;

    - IMessage
      - **{Boolean}** `IMessage.pinned`;
      - **{Promise\<IMessage, Error>}** `IMessage.pin()`;
      - **{Promise\<IMessage, Error>}** `IMessage.unpin()`;

    - IMessageCollection
      - **{Array\<IMessage>}** `IMessageCollection.forChannelPinned(channel)` (same as `pinnedMessages`);
      - **{Promise}** `IMessageCollection.pinMessage(messageId, channelId)`;
      - **{Promise}** `IMessageCollection.unpinMessage(messageId, channelId)`;
      - **{void}** `IMessageCollection.purgeChannelPinned(channel)`;
      - **{void}** `IMessageCollection.purgePinned()`.

## 2016-06-18, Version 0.7.0

#### New:

  - Gateway V5 support;
  - Event `MESSAGE_DELETE_BULK`;
  - Integrated API (REST) error messages;
    (ex. `Error: Bad Request (Cannot send an empty message)`);
  - MFA fields: `IAuthenticatedUser.mfa_enabled`, `IGuild.mfa_level`;
  - Automatic `Bad Gateway` (HTTP 502) handling, will only throw a 502 after
    10 retries.

#### Fixes:

  - Permission overwrites for voice channels now actually have `Voice` section.

## 2016-05-29, Version 0.6.5

#### Fixes:

  - Workaround for `FFmpegEncoder` 'end' event not firing on
    nodejs v5.11.0/4.4.5+.

## 2016-05-23, Version 0.6.4

#### New:

  - User limits in voice channels:

    - Added param `userLimit` to `IChannel.update`;
    - Channel property `user_limit`;
    - Method `channel.join()` will return rejected promise if channel is full
      and permission `Voice.MOVE_MEMBERS` is denied.

## 2016-05-14, Version 0.6.2

#### New:

  - Auto-reconnect with a constructor option:
    `new Discordie({autoReconnect: true});`;
  - Profile editing aliases `IAuthenticatedUser.setAvatar/setUsername`.

## 2016-05-10, Version 0.6.1

#### Discord API Changes:

  - [New `MANAGE_ROLES` (`ADMINISTRATOR`) permission](https://github.com/hammerandchisel/discord-api-docs/issues/41).

#### New:

  - Bulk-delete messages with `IMessageCollection.deleteMessages(array)`;
  - Channel cloning `IChannel.clone(name, type, bitrate)`;
  - Added params `permissionOverwrites`, `bitrate` to `IGuild.createChannel`.

#### Fixes:

  - Fixed self nicknames not setting without `MANAGE_NICKNAMES` permission.

## 2016-05-04, Version 0.6.0

#### New:

  - Method `IMessage.resolveContent()` resolving `<@(#|!|&)?id>` entities to
    names to get human readable content;
  - Nickname support:
    - Permissions `CHANGE_NICKNAME`, `MANAGE_NICKNAMES`;
    - `IGuildMember.nick` property;
    - `IGuildMember.name` getter, returns nick if exists, otherwise username;
    - `IGuildMember.setNickname(nick)` method.
  - Mentionable roles:
    - `IMessage.mention_roles` property;
    - Param `mentionable` in `IRole.commit(name, color, hoist, mentionable)`.
  - Mentions:
    - `IUser/IGuildMember.nickMention` getter;
    - `ITextChannel.mention` getter;
    - `IRole.mention` getter.

## 2016-04-28, Version 0.5.7

#### Fixes:

  - FFmpeg processes will be killed with `SIGKILL` if not exited within
    5 second timeout;
  - Method `uploadFile` now checks file existence if called with a file path.

## 2016-04-25, Version 0.5.6

#### Fixes:

  - `READY` timeout no longer fires after a disconnect.

#### Performance:

  - Internal opus now starts faster.

## 2016-04-19, Version 0.5.5

#### Fixes:

  - FFmpegEncoder stdin errors can now be handled with the standard
    `encoder.stdin.on("error", handler)`;
  - Fixed debug mode FFmpegEncoder listener leak warnings from EventEmitter.

#### Performance:

  - Optimized voice state tracking;
  - Optimized `(DirectMessage)ChannelCollection.get`;
  - Events `PRESENCE_UPDATE` and `TYPING_START` will only fire if there are
    listeners assigned to them.

## 2016-04-17, Version 0.5.4

#### New:

  - Gateway sharding support (`shardId` and `shardCount` options in
    `Discordie` constructor).

#### Fixes:

  - Fixed empty audio output with 48kHz input data.

## 2016-04-14, Version 0.5.2

#### Fixes:

  - Fixed audio subsystem breaking (not buffering data) when using
    [PM2](http://pm2.keymetrics.io/) (process manager);

## 2016-04-13, Version 0.5.1

#### Fixes:

  - Rate limited file uploads with streams now resend data correctly;

#### Performance:

  - Minor performance improvement for audio mixing without volume set.

## 2016-04-12, Version 0.5.0

#### New:

  - High level audio streams (`AudioEncoderStream`, `FFmpegEncoder`,
   `OggOpusPlayer`, `WebmOpusPlayer`),
    instantiated using `IVoiceConnection.createExternalEncoder`
    and `IVoiceConnection.getEncoderStream`.

## 2016-04-09, Version 0.4.4

#### New:

  - Rate limit handling for messages. All messages are now put in a queue
    and sent sequentially;
  - Low level audio API extensions (`AudioEncoder`) -
    new methods `.enqueueMultiple` and `.clearQueue`;
  - Event `GUILD_CREATE` now has a parameter `becameAvailable` to
    discriminate between joined and unavailable guilds.

#### Fixes:

  - Normal precision scheduling now processes packet queue correctly;
  - AudioEncoder queue changed to pause after 1 second of inactivity;
  - V4 READY timeout changed to reset after each `GUILD_CREATE`;
  - Fixed voice disconnecting after resuming gateway connection;

## 2016-04-06, Version 0.4.2

#### New:

  - Gateway V4 support;
  - Exposed `GATEWAY_RESUMED` event;
  - Bans now can be added without member object - `IGuild.ban(user)`.

## 2016-03-25, Version 0.4.0

#### Notable changes:

  - Fully migrated to bot multiserver voice API (user accounts no longer can
    connect to more than one guild concurrently);
  - Improved voice disconnect handling logic: more info in `VOICE_DISCONNECTED`
    event docs (no breaking changes);
  - Presence updates for friend lists are no longer dispatched over
    `PRESENCE_UPDATE` event;
  - *(Discord-side)* `Invites.accept` no longer works on bot accounts.

#### New:

  - Exposed `user.bot` boolean property;
  - Implemented offline guild members requesting:
   `Users.fetchMembers(singleGuildOrGuildsArray)`;
  - Alternative methods for deleting/editing messages by id:
    - `Messages.editMessage(content, messageId, channelId)`;
    - `Messages.deleteMessage(messageId, channelId)`;
  - Pending voice connections can now be cancelled with `.leave()` on the same
    channel.

#### Fixes:

  - `GUILD_MEMBER_REMOVE` is now handled correctly and actually removes
    members from cache;
  - Fixed `IGuild.getPruneEstimate()` and `IGuild.pruneMembers()`;
  - Encoder states are no longer created in proxy mode;
  - Voice connections now properly disconnect on `GUILD_UNAVAILABLE`;
  - Fixed `IVoiceChannel.joined` reporting incorrect state for pending
    connections.

#### Performance:

  - Improved performance for voice encryption and RTP muxing.

## 2016-03-09, Version 0.3.0

#### Notable changes:

  - Memory and CPU usage has been reduced greatly;
  - Implemented caching of member interfaces;
  - Messages are sorted on insertion using binary sort, sorting after fetching
    is removed;
  - `JSON.stringify` on interfaces returns a copy of raw model data instead
    of stringifying models recursively;
  - Interfaces can now be properly formatted (inspected) using `console.log`
    and `util.inspect`;

#### Fixes:

  - Fix voice state tracking on `READY` for clients in multiple servers;
  - Cache voice server address on connect and no longer attempt to resolve
    hostname during UDP packet send calls;
  - Fix `DirectMessageChannels.getOrOpen(recipient)` crashing on node 5.7.0;


## 2016-02-27, Version 0.2.1

#### Performance:

  - Improve performance of `<Collection>.get`;

#### Fixes:

  - Fix voice leave or disconnect crashing the library when called for voice
    connections on secondary gateways;

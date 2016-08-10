"use strict";

const DiscordieDispatcher = require("./core/DiscordieDispatcher");

const events = require("events");
const request = require("./core/ApiRequest");
const DiscordieError = require("./core/DiscordieError");
const Constants = require("./Constants");
const Events = Constants.Events;
const GatewaySocket = require("./networking/ws/GatewaySocket");
const Utils = require("./core/Utils");

const GuildCollection = require("./collections/GuildCollection");
const ChannelCollection = require("./collections/ChannelCollection");
const UserCollection = require("./collections/UserCollection");
const GuildMemberCollection = require("./collections/GuildMemberCollection");
const MessageCollection = require("./collections/MessageCollection");
const PresenceCollection = require("./collections/PresenceCollection");
const VoiceStateCollection = require("./collections/VoiceStateCollection");
const VoiceConnectionCollection = require("./collections/VoiceConnectionCollection");
const UnavailableGuildCollection = require("./collections/UnavailableGuildCollection");
const GuildSyncCollection = require("./collections/GuildSyncCollection");
const CallCollection = require("./collections/CallCollection");
const User = require("./models/User");
const AuthenticatedUser = require("./models/AuthenticatedUser");

const IGuildCollection = require("./interfaces/IGuildCollection");
const IChannelCollection = require("./interfaces/IChannelCollection");
const IAuthenticatedUser = require("./interfaces/IAuthenticatedUser");
const IUserCollection = require("./interfaces/IUserCollection");
const IMessageCollection = require("./interfaces/IMessageCollection");
const IDirectMessageChannelCollection = require("./interfaces/IDirectMessageChannelCollection");
const IInviteManager = require("./interfaces/IInviteManager");

const RequestQueueManager = require("./core/ratelimiting/RequestQueueManager");
const GatewayReconnectHandler = require("./core/GatewayReconnectHandler");
const ReadyEventScheduler = require("./core/ReadyEventScheduler");


const MessageHandlerCache = require("./core/MessageHandlerCache");
const messageHandlerCache = new WeakMap();

const rest = require("./networking/rest");

function handleAuthLoginError(e) {
  this.pendingLogin = false;

  this.Dispatcher.emit(
    Events.DISCONNECTED,
    {error: new DiscordieError("Login failed", e.error)}
  );
}
function handleAuthLoginSuccess(e) {
  this.pendingLogin = false;
  this.token = e.token;
  delete e.token;
  delete e.password;

  rest(this).gateway();
}

function handleGatewayError(e) {
  this.pendingLogin = false;

  var ev = {error: new DiscordieError("Could not get gateway", e.error)};
  if (this.autoReconnect) this.autoReconnect._disconnected(ev);
  this.Dispatcher.emit(Events.DISCONNECTED, ev);
}
function handleGatewaySuccess(e) {
  this.pendingLogin = false;

  this.gatewayEndpoint = e.gateway;
  this._createPrimaryGateway();
}

function registerGatewayHandlers() {
  this.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
    if (e.suppress) { delete e.suppress; delete e.handled; return; }

    const handlers = messageHandlerCache.get(this);
    if (!handlers.processGatewayMessage(e.socket, e.type, e.data) && !e.handled) {
      if (!e.socket.isPrimary) return;
      return this.Dispatcher.emit(
        Events.GATEWAY_UNHANDLED_MESSAGE,
        {type: e.type, data: e.data}
      );
    }

    if (e.handled) delete e.handled;
  });

  const onVoiceMessage = (type, e) => {
    if (e.suppress) { delete e.suppress; delete e.handled; return; }

    const handlers = messageHandlerCache.get(this);
    if (!handlers.processVoiceMessage(e.socket, type, e.data) && !e.handled) {
      return this.Dispatcher.emit(
        Events.VOICESOCKET_UNHANDLED_MESSAGE,
        {type: type, data: e.data}
      );
    }

    if (e.handled) delete e.handled;
  };

  this.Dispatcher.on(Events.VOICE_READY, e => {
    onVoiceMessage("READY", e);
  });
  this.Dispatcher.on(Events.VOICE_SESSION_DESCRIPTION, e => {
    onVoiceMessage("SESSION_DESCRIPTION", e);
  });
  this.Dispatcher.on(Events.VOICE_SPEAKING, e => {
    onVoiceMessage("SPEAKING", e);
  });
}

const defaultOptions = {
  compressMessages: true,
  messageQueue: true,
};

/**
 * @class
 * @classdesc
 * Additional constructor options:
 *
 * ```js
 * var client = new Discordie({
 *   // Maximum amount of messages to store in channel cache.
 *   // Decreasing this will reduce memory usage over time.
 *   // With low values (below 50) chances of message invalidation increase:
 *   // accessing message properties (ex. `e.message.channel`) in callbacks
 *   // of long running tasks (ex. HTTP requests) becomes unsafe.
 *   messageCacheLimit: 1000, // < default
 *
 *   // Guild sharding:
 *   // (Note that this is only intended to be used by large bots.)
 *   // 'shardId'     is a number starting at 0 and less than 'shardCount'
 *   // 'shardCount'  must be a number greater than 1
 *   shardId: 0, shardCount: 2, // sharding is disabled by default
 *
 *   // Gateway auto-reconnect:
 *   // If enabled, 'DISCONNECTED' event will also contain properties
 *   // 'autoReconnect'  boolean, set to true
 *   // 'delay'          delay in milliseconds until next connect attempt
 *   autoReconnect: false, // < default
 * });
 * ```
 */
class Discordie {
  constructor(options) {
    messageHandlerCache.set(this, new MessageHandlerCache(this));

    if (!options) options = defaultOptions;
    const _defaultOptions = Object.assign({}, defaultOptions);
    this.options = Object.assign(_defaultOptions, options);
    Object.defineProperty(this, "options", {writable: false});

    this.token = null;
    this.bot = false;

    /**
     * Primary event bus.
     * @returns {EventEmitter}
     * @example
     * client.Dispatcher.on("GATEWAY_READY", e => {
     *   console.log("Connected as: " + client.User.username);
     * });
     */
    this.Dispatcher = new DiscordieDispatcher();

    this.gatewaySocket = null;

    const gw = () => this.gatewaySocket;

    this._readyScheduler = new ReadyEventScheduler(this, gw);

    this._user = new AuthenticatedUser();
    this._guilds = new GuildCollection(this, gw);
    this._channels = new ChannelCollection(this, gw);
    this._users = new UserCollection(this, gw);
    this._members = new GuildMemberCollection(this, gw);
    this._presences = new PresenceCollection(this, gw);
    this._messages = new MessageCollection(this, gw);
    this._voicestates = new VoiceStateCollection(this, gw);
    this._calls = new CallCollection(this, gw);

    if (options.messageCacheLimit) {
      this._messages.setMessageLimit(options.messageCacheLimit);
    }

    this._queueManager = new RequestQueueManager(this);
    if (!this.options.messageQueue) {
      this._queueManager.disabled = true;
    }

    // == PUBLIC == //

    /**
     * Represents current user.
     * @returns {IAuthenticatedUser}
     */
    this.User = new IAuthenticatedUser(this);

    /**
     * Interface to a collection containing all "Discord Servers"
     * (internally called guilds) current session is connected
     * to. Does not contain unavailable guilds.
     * @returns {IGuildCollection}
     */
    this.Guilds = new IGuildCollection(this,
      () => this._guilds.values(),
      (key) => this._guilds.get(key));

    /**
     * Interface to a collection containing all public channels current session
     * is connected to.
     * @returns {IChannelCollection}
     */
    this.Channels = new IChannelCollection(this,
      () => this._channels.getGuildChannelIterator(),
      (key) => this._channels.getGuildChannel(key));

    /**
     * Interface to a collection containing all users current session has
     * been exposed to.
     *
     * Contains only online users after `READY`.
     * See documentation for `IUserCollection.fetchMembers(guilds)` if you
     * want to load offline members too.
     * @returns {IUserCollection}
     */
    this.Users = new IUserCollection(this,
      () => this._users.values(),
      (key) => this._users.get(key));

    /**
     * Interface to a collection containing all private (direct message)
     * channels current session is connected to.
     * @returns {IDirectMessageChannelCollection}
     */
    this.DirectMessageChannels = new IDirectMessageChannelCollection(this,
      () => this._channels.getPrivateChannelIterator(),
      (key) => this._channels.getPrivateChannel(key));

    /**
     * Interface to a collection containing all cached messages.
     * @returns {IMessageCollection}
     */
    this.Messages = new IMessageCollection(this,
      () => this._messages.getIterator(),
      (key) => this._messages.get(key));

    /**
     * An instance of IInviteManager.
     * @returns {IInviteManager}
     */
    this.Invites = new IInviteManager(this);

    /**
     * An array of VoiceConnectionInfo.
     * @returns {Array<VoiceConnectionInfo>}
     */
    this.VoiceConnections = VoiceConnectionCollection.create(this, gw);

    /**
     * An array of unavailable guild's ids.
     * @returns {Array<String>}
     */
    this.UnavailableGuilds = UnavailableGuildCollection.create(this, gw);

    this.SyncedGuilds = new GuildSyncCollection(this, gw);

    this._readyScheduler._waitFor(this.UnavailableGuilds);
    this._readyScheduler._addTask("GuildSync", this.SyncedGuilds);

    // == EVENTS == //

    this.Dispatcher.on(Events.REQUEST_AUTH_LOGIN_ERROR, handleAuthLoginError.bind(this));
    this.Dispatcher.on(Events.REQUEST_AUTH_LOGIN_SUCCESS, handleAuthLoginSuccess.bind(this));

    this.Dispatcher.on(Events.REQUEST_GATEWAY_ERROR, handleGatewayError.bind(this));
    this.Dispatcher.on(Events.REQUEST_GATEWAY_SUCCESS, handleGatewaySuccess.bind(this));

    /**
     * Auto-reconnect handler.
     * @returns {GatewayReconnectHandler}
     */
    this.autoReconnect = new GatewayReconnectHandler(this);
    if (options.autoReconnect) this.autoReconnect.enable();

    // must register our gateway/voice events last to check e.handled

    registerGatewayHandlers.call(this);

    Utils.privatify(this);
  }

  /**
   * Current state.
   *
   * Possible return values:
   *
   *  - **`DISCONNECTED`**: Initial state. Returned if token is not available.
   *  - **`LOGGING_IN`**
   *  - **`LOGGED_IN`**: Returned if token is set, but gateway websocket is
   *  not connected.
   *  - **`CONNECTING`**
   *  - **`CONNECTED`**
   *
   * State `CONNECTED` only indicates state of gateway websocket connection,
   * returns both before and after `READY`.
   * @returns {String}
   * @readonly
   */
  get state() {
    if (this.pendingLogin)
      return Constants.DiscordieState.LOGGING_IN;

    if (this.gatewaySocket) {
      if (this.gatewaySocket.connected)
        return Constants.DiscordieState.CONNECTED;
      if (this.gatewaySocket.connecting)
        return Constants.DiscordieState.CONNECTING;
    }

    if (this.token)
      return Constants.DiscordieState.LOGGED_IN;

    return Constants.DiscordieState.DISCONNECTED;
  }

  /**
   * Gets a value indicating whether the gateway websocket connection is
   * established.
   * @returns {boolean}
   * @readonly
   */
  get connected() {
    return this.state == Constants.DiscordieState.CONNECTED;
  }

  /**
   * @param {Object} credentials - Can contain `email`, `password` or `token`
   */
  connect(credentials) {
    if (this.state == Constants.DiscordieState.CONNECTED
      || this.state == Constants.DiscordieState.CONNECTING
      || this.pendingLogin)
      return;

    this.pendingLogin = true;

    if (credentials && credentials.hasOwnProperty("bot")) {
      this.bot = credentials.bot;
    }

    if (credentials && credentials.token) {
      this.token = credentials.token;
      credentials = null;
    }

    if (!credentials && this.token) {
      rest(this).gateway();
      return;
    }

    rest(this).auth.login(credentials);
  }

  /**
   * Disconnects primary gateway websocket.
   */
  disconnect() {
    if (this.gatewaySocket) {
      this.gatewaySocket.disconnect();
      this.gatewaySocket = null;
    }
  }

  _createPrimaryGateway() {
    if (!this.gatewaySocket) {
      const compressMessages = this.options.compressMessages;
      const shardId = this.options.shardId;
      const shardCount = this.options.shardCount;

      const gatewayOptions = {compressMessages, shardId, shardCount};

      this.gatewaySocket = new GatewaySocket(this, gatewayOptions);
    }
    this.gatewaySocket.connect(this.gatewayEndpoint);
  }
}

Discordie.Events = Constants.Events;
Discordie.StatusTypes = Constants.StatusTypes;
Discordie.ActivityTypes = Constants.ActivityTypes;
Discordie.States = Constants.DiscordieState;
Discordie.Permissions = Constants.Permissions;
Discordie.VerificationLevel = Constants.VerificationLevel;
Discordie.Errors = Constants.Errors;
Discordie.ChannelTypes = Constants.ChannelTypes;
Discordie.MessageTypes = Constants.MessageTypes;

module.exports = Discordie;

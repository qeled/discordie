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
const User = require("./models/User");
const AuthenticatedUser = require("./models/AuthenticatedUser");

const IGuildCollection = require("./interfaces/IGuildCollection");
const IChannelCollection = require("./interfaces/IChannelCollection");
const IAuthenticatedUser = require("./interfaces/IAuthenticatedUser");
const IUserCollection = require("./interfaces/IUserCollection");
const IMessageCollection = require("./interfaces/IMessageCollection");
const IDirectMessageChannelCollection = require("./interfaces/IDirectMessageChannelCollection");
const IInviteManager = require("./interfaces/IInviteManager");


const MessageHandlerCache = require("./core/MessageHandlerCache");
const messageHandlerCache = new WeakMap();

const rest = require("./networking/rest");

const defaultOptions = {
  // todo: game name support
  //gameNameSupport: true,
  compressMessages: true,
};

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

  this.Dispatcher.emit(
    Events.DISCONNECTED,
    {error: new DiscordieError("Could not get gateway", e.error)}
  );
}
function handleGatewaySuccess(e) {
  this.pendingLogin = false;

  this.gatewayEndpoint = e.gateway;
  this._createPrimaryGateway();
}

function registerGatewayHandlers() {
  this.Dispatcher.on(Events.GATEWAY_DISPATCH, e => {
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

/**
 * @class
 */
class Discordie {
  constructor(options) {
    messageHandlerCache.set(this, new MessageHandlerCache(this));

    if (!options) options = defaultOptions;
    this.options = options;
    Object.defineProperty(this, "options", {writable: false});

    this.Dispatcher = new DiscordieDispatcher();

    this.gatewaySocket = null;

    this.Dispatcher.on(Events.DISCONNECTED, (e) => {
      this.VoiceConnections.disconnectSecondary();
    });

    const gw = () => this.gatewaySocket;

    this._user = new AuthenticatedUser();
    this._guilds = new GuildCollection(this, gw);
    this._channels = new ChannelCollection(this, gw);
    this._users = new UserCollection(this, gw);
    this._members = new GuildMemberCollection(this, gw);
    this._presences = new PresenceCollection(this, gw);
    this._messages = new MessageCollection(this, gw);
    this._voicestates = new VoiceStateCollection(this, gw);

    if (options.messageCacheLimit) {
      this._messages.setMessageLimit(options.messageCacheLimit);
    }

    // == PUBLIC == //

    /**
     * An instance of IAuthenticatedUser.
     * @returns {IAuthenticatedUser}
     */
    this.User = new IAuthenticatedUser(this);

    /**
     * An instance of IGuildCollection.
     * @returns {IGuildCollection}
     */
    this.Guilds = new IGuildCollection(this,
      () => this._guilds.values(),
      (key) => this._guilds.get(key));

    /**
     * An instance of IChannelCollection.
     * @returns {IChannelCollection}
     */
    this.Channels = new IChannelCollection(this,
      () => this._channels.getGuildChannelIterator());

    /**
     * An instance of IUserCollection.
     * @returns {IUserCollection}
     */
    this.Users = new IUserCollection(this,
      () => this._users.values(),
      (key) => this._users.get(key));

    /**
     * An instance of IDirectMessageChannelCollection.
     * @returns {IDirectMessageChannelCollection}
     */
    this.DirectMessageChannels = new IDirectMessageChannelCollection(this,
      () => this._channels.getPrivateChannelIterator());

    /**
     * An instance of IMessageCollection.
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
     * An array of IVoiceConnection.
     * @returns {Array<IVoiceConnection>}
     */
    this.VoiceConnections =
      new VoiceConnectionCollection(this, () => this.gatewaySocket);

    // == EVENTS == //

    this.Dispatcher.on(Events.REQUEST_AUTH_LOGIN_ERROR, handleAuthLoginError.bind(this));
    this.Dispatcher.on(Events.REQUEST_AUTH_LOGIN_SUCCESS, handleAuthLoginSuccess.bind(this));

    this.Dispatcher.on(Events.REQUEST_GATEWAY_ERROR, handleGatewayError.bind(this));
    this.Dispatcher.on(Events.REQUEST_GATEWAY_SUCCESS, handleGatewaySuccess.bind(this));

    // must register our gateway/voice events last to check e.handled

    registerGatewayHandlers.call(this);

    Utils.privatify(this);
  }

  /**
   * Current state.
   * @returns {String}
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
   * Gets a value indicating whether the websocket connection is established.
   * @returns {boolean}
   */
  get connected() {
    return this.state == Constants.DiscordieState.CONNECTED;
  }

  /**
   * @param {Object} credentials - Can contain `email`, `password` or `token`
   * @param {boolean} forceNewSession - Forces to log in with email and password
   */
  connect(credentials, forceNewSession) {
    if (this.state == Constants.DiscordieState.CONNECTED
      || this.state == Constants.DiscordieState.CONNECTING
      || this.pendingLogin)
      return;

    if (forceNewSession) {
      this.disconnect();
      this.token = null;
    }

    this.pendingLogin = true;

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
   * Disconnects primary websocket.
   */
  disconnect() {
    this.VoiceConnections.disconnectSecondary();
    if (this.gatewaySocket) {
      this.gatewaySocket.disconnect();
      this.gatewaySocket = null;
    }
  }

  _createPrimaryGateway() {
    if (!this.gatewaySocket)
      this.gatewaySocket = new GatewaySocket(this, this.options.compressMessages);
    this.gatewaySocket.connect(this.gatewayEndpoint);
  }
  _createSecondaryGateway() {
    const gw = new GatewaySocket(this, this.options.compressMessages);
    gw.connect(this.gatewayEndpoint);
    return gw;
  }
}

Discordie.Events = Constants.Events;
Discordie.StatusTypes = Constants.StatusTypes;
Discordie.States = Constants.DiscordieState;
Discordie.Permissions = Constants.Permissions;
Discordie.VerificationLevel = Constants.VerificationLevel;

module.exports = Discordie;

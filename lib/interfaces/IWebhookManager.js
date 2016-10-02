"use strict";

const Utils = require("../core/Utils");

const rest = require("../networking/rest");

function webhookToId(webhook) {
  if (!webhook) throw new TypeError("Param 'webhook' is invalid");
  if (typeof webhook === "string") return webhook;
  return webhook.id;
}

/**
 * @interface
 * @description
 * Wrapper for webhook methods.
 *
 * Example webhook object:
 * ```js
 * {
 *   "name": "abc",
 *   "channel_id": "78231142373424474",
 *   "token": "EtuNYHGkElBlE7BE266Jk...NzHvccXaUCQUOY64NbFWz9zbQ",
 *   "avatar": null,
 *   "guild_id": "78231498370026660",
 *   "id": "232330225768333313",
 *   "user": {
 *     "username": "testuser",
 *     "discriminator": "3273",
 *     "id": "000000000000000000",
 *     "avatar": null
 *   }
 * }
 * ```
 */
class IWebhookManager {
  constructor(discordie) {
    this._discordie = discordie;
    Utils.privatify(this);
    Object.freeze(this);
  }

  /**
   * **Requires logging in with an API token.**
   *
   * Makes a request to get webhook objects for the specified guild.
   * @param {IGuild|String} guild
   * @return {Promise<Array<Object>, Error>}
   */
  fetchForGuild(guild) {
    guild = guild.valueOf();
    return rest(this._discordie).webhooks.getGuildWebhooks(guild);
  }

  /**
   * **Requires logging in with an API token.**
   *
   * Makes a request to get webhook objects for the specified channel.
   * @param {IChannel|String} channel
   * @return {Promise<Array<Object>, Error>}
   */
  fetchForChannel(channel) {
    channel = channel.valueOf();
    return rest(this._discordie).webhooks.getChannelWebhooks(channel);
  }

  /**
   * **Requires logging in with an API token.**
   *
   * Makes a request to create a webhook for the channel.
   *
   * Promise resolves with a webhook object.
   * @param {IChannel} channel
   * @param {Object} options
   * Object with properties `{name: String, avatar: Buffer|String|null}`.
   *
   * String avatars must be base64 data-url encoded.
   * @return {Promise<Object, Error>}
   */
  create(channel, options) {
    channel = channel.valueOf();

    options = options || {};
    if (options.avatar instanceof Buffer) {
      options.avatar = Utils.imageToDataURL(options.avatar);
    }

    return rest(this._discordie).webhooks.createWebhook(channel, options);
  }

  /**
   * Makes a request to fetch a webhook object.
   *
   * Promise resolves with a webhook object (does not contain a `user` object
   * if fetched with `token` param).
   * @param {Object|String} webhook - Webhook object or id.
   * @param {String} token
   * Webhook token, not required if currently logged in
   * with an account that has access to the webhook.
   * @return {Promise<Object, Error>}
   */
  fetch(webhook, token) {
    const webhookId = webhookToId(webhook);
    return rest(this._discordie).webhooks.getWebhook(webhookId, token);
  }

  /**
   * Makes a request to edit the specified webhook.
   *
   * Promise resolves with a webhook object (does not contain a `user` object
   * if edited with `token` param).
   * @param {Object|String} webhook - Webhook object or id.
   * @param {String} token
   * Webhook token, not required and can be set to null if currently logged in
   * with an account that has access to the webhook.
   * @param {Object} options
   * Object with properties `{name: String, avatar: Buffer|String|null}`.
   *
   * String avatars must be base64 data-url encoded.
   * @return {Promise<Object, Error>}
   */
  edit(webhook, token, options) {
    const webhookId = webhookToId(webhook);

    options = options || {};
    if (options.avatar instanceof Buffer) {
      options.avatar = Utils.imageToDataURL(options.avatar);
    }

    return rest(this._discordie)
      .webhooks.patchWebhook(webhookId, token, options);
  }

  /**
   * Makes a request to delete the specified webhook.
   * @param {Object|String} webhook - Webhook object or id.
   * @param {String} token
   * Webhook token, not required and can be set to null if currently logged in
   * with an account that has access to the webhook.
   * @return {Promise}
   */
  delete(webhook, token) {
    const webhookId = webhookToId(webhook);
    return rest(this._discordie)
      .webhooks.deleteWebhook(webhookId, token);
  }

  /**
   * Makes a request to execute the specified webhook.
   *
   * > **Note:** Embeds in file uploads are not supported.
   * @param {Object|String} webhook - Webhook object or id.
   * @param {String} token - Required unless webhook object contains token.
   * @param {Object} options
   * Refer to [official API documentation](https://discordapp.com/developers/docs/)
   * for more information.
   * @param {boolean} [wait]
   * Wait for server confirmation of message delivery,
   * returned promise will contain a raw message object or an error if message
   * creation failed.
   * @return {Promise}
   * @example
   * const webhookId = "232330225768333313";
   * const token = "EtuNYHGkElBlE7BE266Jk...NzHvccXaUCQUOY64NbFWz9zbQ";
   * client.Webhooks.execute(webhookId, token, {content: "text message"});
   * client.Webhooks.execute(webhookId, token, {
   *   // text message
   *   content: "text message",
   *   username: "Different Username",
   *   avatar_url: "https://localhost/test.png",
   *   tts: false,
   *   embeds: [{
   *     color: 0x3498db,
   *     author: {name: "who dis"},
   *     title: "This is an embed",
   *     description: "Nobody will read this anyway",
   *     url: "http://google.com",
   *     timestamp: "2016-10-03T03:32:31.205Z",
   *     fields: [{name: "some field", value: "some value"}],
   *     footer: {text: "footer text"}
   *   }]
   * });
   *
   * client.Webhooks.execute(webhookId, token, {
   *   // file upload
   *   content: "text message",
   *   username: "Different Username",
   *   file: fs.readFileSync("test.png"),
   *   filename: "test.png"
   * });
   */
  execute(webhook, token, options, wait) {
    const webhookId = webhookToId(webhook);
    token = token || webhook.token;
    return rest(this._discordie)
      .webhooks.executeWebhook(webhookId, token, options, wait);
  }

  /**
   * Makes a request to execute the specified webhook with slack-compatible
   * options.
   * @param {Object|String} webhook - Webhook object or id.
   * @param {String} token - Required unless webhook object contains token.
   * @param {Object} options
   * Refer to [Slack's documentation](https://api.slack.com/incoming-webhooks)
   * for more information.
   *
   * Discord does not support Slack's `channel`, `icon_emoji`, `mrkdwn`,
   * or `mrkdwn_in` properties.
   * @param {boolean} [wait]
   * Wait for server confirmation of message delivery, defaults to true.
   * When set to false, a message that is not saved does not return an error.
   * @return {Promise}
   * @example
   * const webhookId = "232330225768333313";
   * const token = "EtuNYHGkElBlE7BE266Jk...NzHvccXaUCQUOY64NbFWz9zbQ";
   * client.Webhooks.executeSlack(webhookId, token, {
   *   text: "text message",
   *   username: "Different Username"
   * });
   */
  executeSlack(webhook, token, options, wait) {
    const webhookId = webhookToId(webhook);
    token = token || webhook.token;
    return rest(this._discordie)
      .webhooks.executeSlackWebhook(webhookId, token, options, wait);
  }
}

module.exports = IWebhookManager;

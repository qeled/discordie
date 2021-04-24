'use strict'

const Constants = require('../../../Constants')
const Events = Constants.Events
const Endpoints = Constants.Endpoints
const apiRequest = require('../../../core/ApiRequest')

module.exports = function (guildId, userId, actionType, limit, before) {
  return new Promise((rs, rj) => {
    var request = apiRequest
      .get(this, {
        url: `${Endpoints.GUILD_AUDIT_LOGS(guildId)}`,
        query: {
          userId: userId || undefined,
          action_type: actionType || undefined,
          limit: limit || 50,
          before: before || undefined
        }
      })

    this._queueManager.put(request, (err, res) => {
      return (!err && res.ok) ? rs(res.body) : rj(err)
    })
  })
}

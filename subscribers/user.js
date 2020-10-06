var { getOptionValue } = require('../helpers')
if (process.env.DB_TYPE !== 'mongodb') {
  var Token = require('../models/sql/token')
}
var User = require(process.env.DB_TYPE === 'mongodb'
  ? '../models/mongodb/user'
  : '../models/sql/user')

aventum.hooks.addAction(
  'loginSuccess',
  'Aventum/Core/subscribers/user',
  async (user, token, req) => {
    req.user = user
    req.token = token

    const jwt = require('jsonwebtoken')
    // Delete expired tokens
    let userTokens = []
    if (process.env.DB_TYPE === 'mongodb') {
      userTokens = user.tokens
    } else {
      userTokens = await Token.getUserTokens(user.id)
    }
    for (var obj of userTokens) {
      try {
        var JWT_SECRET = await getOptionValue('JWT_SECRET')
        jwt.verify(obj.token, JWT_SECRET)
      } catch (e) {
        // Something wrong with this token so delete it
        User.removeToken(user.id, obj.token)
      }
    }
  }
)

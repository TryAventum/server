const Model = require('./lib/Model')

class Token extends Model {
  constructor (values = null) {
    super('tokens')
    this.modelConfig.values = values
  }

  static async getUserTokens (userId) {
    var Token = this

    var cacheKey = `tokens:p:all:${userId}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        const query = { userId }

        var tokens = await Token.find({ where: query })

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, tokens)

        return tokens
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }
}

module.exports = Token

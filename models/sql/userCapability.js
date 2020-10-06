const Model = require('./lib/Model')

class UserCapability extends Model {
  constructor (values = null) {
    super('userCapability')
    this.modelConfig.values = values
  }

  static async getAll (userId) {
    var UserCapability = this

    var cacheKey = `userCapability:p:all:${userId}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        const query = { userId }

        var userCapability = await UserCapability.find({ where: query })

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, userCapability)

        return userCapability
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }
}

module.exports = UserCapability

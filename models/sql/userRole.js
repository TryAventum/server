const Model = require('./lib/Model')

class UserRole extends Model {
  constructor (values = null) {
    super('userRole')
    this.modelConfig.values = values
  }

  static async getAll (userId) {
    var UserRole = this

    var cacheKey = `userRole:p:all:${userId}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        const query = { userId }

        var userRole = await UserRole.find({ where: query })

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, userRole)

        return userRole
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }
}

module.exports = UserRole

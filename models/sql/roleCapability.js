const Model = require('./lib/Model')

class RoleCapability extends Model {
  constructor (values = null) {
    super('roleCapability')
    this.modelConfig.values = values
  }

  static async getAll () {
    var RoleCapability = this

    var cacheKey = 'roleCapability:p:all'

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        const query = {}

        var roleCapability = await RoleCapability.find({ where: query })

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, roleCapability)

        return roleCapability
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }
}

module.exports = RoleCapability

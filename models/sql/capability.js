const Model = require('./lib/Model')

class Capability extends Model {
  constructor (values = null) {
    super('capabilities')
    this.modelConfig.values = values
  }

  static async getAllCapabilities (req, user = null) {
    var Capability = this

    var cacheKey
    if (user) {
      cacheKey = `capabilities:p:all:${user.id}`
    } else {
      cacheKey = 'capabilities:p:all'
    }

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        const query = {}
        if (user) {
          query.createdBy = user.id
        }
        var capabilities = await Capability.find({ where: query })

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, capabilities)

        return capabilities
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async getCapability (id, user = null) {
    var Capability = this

    var cacheKey = `capabilities:g:${id}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        var { getStringID } = require('../../std-helpers')
        
        var capability = await Capability.findRow({
          id
        })

        if (!capability) {
          return null
        }

        if (user && getStringID(user.id) !== getStringID(capability.createdBy)) {
          return 403
        }

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, capability)

        return capability
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async deleteById (id) {
    if (!id) {
      return null
    }

    var Capability = this

    try {
      const capability = await Capability.del({ id })

      return capability
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async updateCapability (options) {
    try {
      const Capability = this

      const capability = await Capability.updateOne({
        where: { id: options.id },
        values: options.values
      })

      return capability
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async bulkInsertRows (rows) {
    const Capability = this

    const insertedRows = await Capability.create(rows)

    return insertedRows
  }
}

module.exports = Capability

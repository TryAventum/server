const Model = require('./lib/Model')
const { Paginator } = require('../../packages/paginator/index')

class Extension extends Model {
  constructor (values = null) {
    super('extensions')
    this.modelConfig.values = values
  }

  static async deleteByName (name) {
    const Extension = this

    try {
      const extension = await Extension.del({ name })

      return extension
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async getExtension (name) {
    var Extension = this

    var cacheKey = `extensions:g:${name}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        var extension = await Extension.findRow({
          name
        })

        if (!extension) {
          return null
        }

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, extension)

        return extension
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async getAllExtensions () {
    var { getAllExtensions } = require('../../extensions-helpers')
    var Extension = this

    var cacheKey = 'extensions:p:all'

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        const query = {}

        var activeExtensions = await Extension.find({ where: query })

        var extensions = await getAllExtensions(activeExtensions)

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, extensions)

        return extensions
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async getExtensions (req) {
    var Extension = this

    const page = +req.query.page
    var query = req.query.query ? JSON.parse(req.query.query) : {}

    var cacheKey = 'extensions:p:' + req.originalUrl

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        var count = await Extension.count(query)
        const paginatorInstance = new Paginator(page, 20, count)

        var extensions = await Extension.find({
          ...query,
          offset: paginatorInstance.offset(),
          limit: paginatorInstance.perPage
        })

        var ress = {
          extensions: extensions,
          pagination: {
            totalPages: paginatorInstance.totalPages(),
            perPage: paginatorInstance.perPage,
            totalCount: paginatorInstance.totalCount
          }
        }

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, ress)

        return ress
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }
}

module.exports = Extension

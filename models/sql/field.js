const Model = require('./lib/Model')
const { Paginator } = require('../../packages/paginator/index')
var { getStringID } = require('../../std-helpers')

class Field extends Model {
  constructor (values = null) {
    super('fields')
    this.modelConfig.values = values
  }

  static async createField (values) {
    const Field = this
    try {
      const field = await Field.create(values)

      return field
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async updateField (options) {
    try {
      const Field = this

      const field = await Field.updateOne({
        where: { id: options.id },
        values: { ...options.values, updatedAt: aventum.knex.fn.now(6) }
      })

      return field
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async deleteById (id) {
    if (!id) {
      return null
    }

    var Field = this

    try {
      const field = await Field.del({ id })

      return field
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async getField (id, user = null) {
    var Field = this

    var cacheKey = `fields:g:${id}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        var field = await Field.findRow({
          id
        })

        if (!field) {
          return null
        }

        if (user && getStringID(user.id) !== getStringID(field.createdBy)) {
          return 403
        }

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, field)

        return field
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async getFieldByName (name, user = null) {
    var Field = this

    var cacheKey = `fields:g:${name}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        var allCustomFields = await Field.getAllFields()

        const field = allCustomFields.find(s => s.name === name)

        if (!field) {
          return null
        }

        if (user && getStringID(user.id) !== getStringID(field.createdBy)) {
          return 403
        }

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, field)

        return field
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async getAllFields (req = null, user = null) {
    var Field = this

    var cacheKey
    if (user) {
      cacheKey = `fields:p:all:${user.id}`
    } else {
      cacheKey = 'fields:p:all'
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
        query.where = {}
        if (user) {
          query.where.createdBy = user.id
        }

        var fields = await Field.find(query)

        fields = fields.map(f => {
          f.fields = JSON.parse(f.fields)

          return f
        })

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, fields)

        return fields
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async getFields (req, user = null) {
    var Field = this

    const page = +req.query.page
    var query = req.query.query ? JSON.parse(req.query.query) : {}

    if (user) {
      if (query.where) {
        query.where.createdBy = user.id
      } else {
        query.where = {}
        query.where.createdBy = user.id
      }
    }

    var cacheKey
    if (user) {
      cacheKey = `fields:p:${user.id}:` + req.originalUrl
    } else {
      cacheKey = 'fields:p:' + req.originalUrl
    }

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        var count = await Field.count(query)
        const paginatorInstance = new Paginator(page, 20, count)

        var fields = await Field.find({
          ...query,
          offset: paginatorInstance.offset(),
          limit: paginatorInstance.perPage
        })

        var ress = {
          fields,
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

module.exports = Field

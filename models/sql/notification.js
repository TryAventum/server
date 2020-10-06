const Model = require('./lib/Model')
const { Paginator } = require('../../packages/paginator/index')

class Notification extends Model {
  constructor (values = null) {
    super('notifications')
    this.modelConfig.values = values
  }

  static async getNotification (id) {
    var Notification = this

    var cacheKey = `notifications:g:${id}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        var notification = await Notification.findRow({ id })

        if (!notification) {
          return null
        }

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, notification)

        return notification
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async createNotification (values) {
    const Notification = this
    try {
      const notification = await Notification.create(values)

      return notification
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async deleteNotification (query) {
    var Notification = this

    try {
      const notification = await Notification.del(query)

      return notification
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async bulkInsertRows (rows) {
    const Notification = this

    const insertedRows = await Notification.create(rows)

    return insertedRows
  }

  static async updateNotification (options) {
    try {
      const Notification = this

      const notification = await Notification.updateOne({
        where: { id: options.id },
        values: { ...options.values, updatedAt: aventum.knex.fn.now(6) }
      })

      return notification
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async getNotifications (req) {
    var Notification = this

    const page = +req.query.page
    var query = req.query.query ? JSON.parse(req.query.query) : {}

    if (query.where) {
      query.where.userId = req.user.id
    } else {
      query.where = {}
      query.where.userId = req.user.id
    }

    var cacheKey = `notifications:p:${req.user.id}:` + req.originalUrl

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        var count = await Notification.count(query)
        const paginatorInstance = new Paginator(page, 20, count)

        var notifications = await Notification.find({
          ...query,
          offset: paginatorInstance.offset(),
          limit: paginatorInstance.perPage
        })

        var ress = {
          notifications,
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

module.exports = Notification

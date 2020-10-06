var mongoose = require('mongoose')
const { ObjectID } = require('mongodb')
var { queryParser } = require('../../helpers')

var { notificationType, notificationsStatuses } = require('../../commons')

const { Paginator } = require('../../packages/paginator/index')

var NotificationSchema = new mongoose.Schema(
  {
    header: {
      type: String
    },
    content: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: notificationType,
      default: 'info'
    },
    status: {
      type: String,
      enum: notificationsStatuses,
      default: 'unread'
    },
    touched: {
      type: Boolean,
      default: false
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  {
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true
    }
  }
)

NotificationSchema.statics.bulkInsertRows = async function (rows) {
  const Notification = this

  const notificationsDocuments = await Notification.insertMany(rows)

  return notificationsDocuments
}

NotificationSchema.statics.getNotifications = async function (req) {
  var Notification = this

  const page = +req.query.page
  var query = req.query.query ? JSON.parse(req.query.query) : {}

  if (query.where) {
    query.where.userId = req.user.id
  } else {
    query.where = {}
    query.where.userId = req.user.id
  }

  query = queryParser(query)

  var cacheKey = `notifications:p:${req.user._id}:` + req.originalUrl

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var count = await Notification.countDocuments(query).exec()
      const paginatorInstance = new Paginator(page, 20, count)

      var notifications = await Notification.find(query)
        .sort({ _id: -1 })
        .skip(paginatorInstance.offset())
        .limit(paginatorInstance.perPage)
        .exec()

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

NotificationSchema.statics.deleteNotification = async function (query) {
  var Notification = this

  if (!ObjectID.isValid(query.id)) {
    return null
  }

  query._id = query.id

  delete query.id

  try {
    const notification = await Notification.findOneAndRemove(query)

    return notification
  } catch (error) {
    console.log(error)

    return null
  }
}

NotificationSchema.statics.updateNotification = async function (options) {
  if (!ObjectID.isValid(options.id)) {
    return null
  }

  var Notification = this

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: options.id },
      { $set: options.values },
      { new: true, runValidators: true }
    )

    return notification
  } catch (error) {
    console.log(error)
    return null
  }
}

NotificationSchema.statics.createNotification = async function (values) {
  try {
    const Notification = this

    var notification = new Notification(values)

    notification = await notification.save()

    return notification
  } catch (error) {
    throw new Error(error)
  }
}
NotificationSchema.statics.getNotification = async function (_id) {
  if (!ObjectID.isValid(_id)) {
    return null
  }

  var Notification = this

  var cacheKey = `notifications:g:${_id}`

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var notification = await Notification.findOne({
        _id
      }).exec()

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

var Notification = mongoose.model('Notification', NotificationSchema)

module.exports = Notification

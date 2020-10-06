var Notification = require(process.env.DB_TYPE === 'mongodb'
  ? '../models/mongodb/notification'
  : '../models/sql/notification')
var isUndefined = require('lodash/fp/isUndefined')
var omitBy = require('lodash/fp/omitBy')
var flow = require('lodash/fp/flow')

module.exports.get = async (req, res) => {
  try {
    var result = await Notification.getNotifications(req)

    return res.send(result)
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.post = async (req, res) => {
  try {
    let data = {
      content: req.body.content,
      header: req.body.header,
      user: req.user.id,
      type: req.body.type,
      status: req.body.status,
      touched: req.body.touched
    }

    data = flow(
      omitBy(isUndefined)
    )(data)

    var notification = await Notification.createNotification(data)

    aventum.hooks.doActionSync('notificationCreated', notification, req, res)

    // Delete the cache of the GET /notifications, GET /notifications/all
    aventum.cache.batchDeletionKeysByPattern('notifications:p:*')

    res.send(notification)
  } catch (error) {
    res.status(400).send(error)
  }
}

module.exports.getById = async (req, res) => {
  try {
    var notification = await Notification.getNotification(req.params.id)

    if (notification === null) {
      return res.status(404).send()
    }

    return res.send({ notification })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.deleteById = (req, res) => {
  var id = req.params.id

  var cacheKey = `notifications:g:${id}`

  Notification.deleteNotification({
    id,
    user: req.user.id
  })
    .then(notification => {
      if (!notification) {
        return res.status(404).send()
      }

      aventum.cache.deleteKey(cacheKey)
      aventum.cache.batchDeletionKeysByPattern(
        `notifications:p:${req.user.id}:*`
      )

      aventum.hooks.doActionSync('notificationDeleted', notification, req, res)

      res.send({ notification })
    })
    .catch(e => {
      res.status(400).send()
    })
}

module.exports.patchById = (req, res) => {
  var id = req.params.id

  let data = { status: req.body.status, touched: true }

  data = flow(
    omitBy(isUndefined)
  )(data)

  var cacheKey = `notifications:g:${id}`

  Notification.updateNotification({ id, values: data })
    .then(notification => {
      if (!notification) {
        return res.status(404).send()
      }

      aventum.cache.deleteKey(cacheKey)
      aventum.cache.batchDeletionKeysByPattern(
        `notifications:p:${req.user.id}:*`
      )

      aventum.hooks.doActionSync('notificationUpdated', notification, req, res)
      res.send({ notification })
    })
    .catch(e => {
      res.status(400).send()
    })
}

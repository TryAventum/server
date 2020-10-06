var path = require('path')
var fse = require('fs-extra')
var Extension = require(process.env.DB_TYPE === 'mongodb'
  ? './models/mongodb/extension'
  : './models/sql/extension')
var User = require(process.env.DB_TYPE === 'mongodb'
  ? './models/mongodb/user'
  : './models/sql/user')
var Notification = require(process.env.DB_TYPE === 'mongodb'
  ? './models/mongodb/notification'
  : './models/sql/notification')
var { listExtensions } = require('./std-helpers')

/**
 * This function may call internally without a req, if it called internally
 * then we must pass options object
 * @param {object} req the req object
 * @param {object} res the res object
 * @param {object} options must contain extension property
 */
module.exports.extensionNotExist = async (
  req = null,
  res = null,
  options = null
) => {
  try {
    // 1. Deactivate the plugin
    var reqExtension = req ? req.body.extension : options.extension

    var cacheKey = `extensions:g:${reqExtension.name}`

    // Remove it(deactivate it)
    var extension = await Extension.deleteByName(reqExtension.name)

    if (!extension) {
      return res ? res.status(404).send() : 404
    }

    aventum.cache.deleteKey(cacheKey)
    aventum.cache.batchDeletionKeysByPattern('extensions:p:*')

    // 2. Notify supers and admins
    // 2.1 Get all admins and supers then create notifications for them
    var users = await User.getUsersByRolesNames(['super', 'administrator'])

    var allNotifications = []

    allNotifications = users.map((u) => {
      return {
        userId: u.id,
        type: 'error',
        header: aventum.i18n.t('ExtensionDeactivated'),
        content: aventum.i18n.t('ExtensionDeactivatedFileNotExist', {
          extensionName: reqExtension.name,
          interpolation: { escapeValue: false },
        }),
      }
    })

    await Notification.bulkInsertRows(allNotifications)

    if (reqExtension.aventum) {
      reqExtension.aventum.active = false
      reqExtension.aventum.target = null
    } else {
      reqExtension.aventum = {}
      reqExtension.aventum.active = false
      reqExtension.aventum.target = null
    }

    extension = reqExtension

    aventum.hooks.doActionSync(
      'extensionDeactivatedSync',
      extension,
      req,
      res,
      options
    )

    await aventum.hooks.doAction(
      'extensionDeactivated',
      extension,
      req,
      res,
      options
    )

    var result = await aventum.hooks.applyFilters(
      'sendExtensionNotExistResponse',
      true,
      extension,
      req,
      res,
      options
    )

    if (result) {
      var response = { extension }
      response = await aventum.hooks.applyFilters(
        'extensionNotExistResponse',
        response,
        req,
        res,
        options
      )
      return res ? res.send(response) : response
    }
  } catch (error) {
    return res ? res.status(400).send(error) : error
  }
}

module.exports.getAllExtensions = async (activeExtensions) => {
  var cacheKey = 'extensions:p:all'

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      // Get all extensions
      var allExtensions = listExtensions(
        path.join(__dirname, './content/extensions')
      )

      // listExtensions will return the package.json for the plugins, here load the package.json file
      const extensionsData = allExtensions.map((e) => {
        const data = require(`${e}`)
        data.aventum.path = e.replace(aventum.dir, '')

        return data
      })

      // If the extension exist in the database(activeExtensions) then it is active
      var activeExtensionsCount = 0
      var extensions = extensionsData.map((e) => {
        var isActive = activeExtensions.find((i) => i.name === e.name)
        if (isActive) {
          e.aventum.active = true
          activeExtensionsCount++
        } else {
          e.aventum.active = false
        }

        return e
      })

      /**
       * There are extensions in the database that their files doesn't exist,
       * deactivate them(remove them from the database)
       * then notify the supers and admins about them
       */
      if (activeExtensionsCount < activeExtensions.length) {
        // TODO is doing the following violate this file(std-helpers.js) purpose?
        for (const ext of activeExtensions) {
          const isExist = extensions.find((i) => i.name === ext.name)
          if (!isExist) {
            await module.exports.extensionNotExist(null, null, { extension: ext })
          }
        }
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, extensions)

      return extensions
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

module.exports.removeExtensionFiles = async (name) => {
  var { getOptionValue } = require('./helpers')
  var result = {}

  try {
    var extensions = await Extension.getAllExtensions()

    var extension = extensions.find((e) => e.name === name)

    if (!extension) {
      result.errorCode = 404
      return result
    }

    var serverExtensionFolderPath = path.join(
      __dirname,
      `./content/extensions/${name}`
    )

    await fse.remove(serverExtensionFolderPath)
    if (extension.aventum.target === 'dashboard') {
      var DASHBOARD_ABS_PATH = await getOptionValue('DASHBOARD_ABS_PATH')
      var dashboardExist = await fse.pathExists(DASHBOARD_ABS_PATH)

      if (dashboardExist) {
        var dashboardExtensionFolderPath = `${DASHBOARD_ABS_PATH}/${
          process.env.NODE_ENV === 'development'
            ? 'public/content/extensions'
            : 'build/content/extensions'
        }/${extension.name}`

        await fse.remove(dashboardExtensionFolderPath)
      } else {
        result.message = aventum.i18n.t('DashboardNotExistMsg')
      }
    }

    return result
  } catch (error) {
    console.error(error)
    result.errorCode = 500
    return result
  }
}

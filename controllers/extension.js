var Extension = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/extension' : '../models/sql/extension')
const { removeExtensionFiles, extensionNotExist } = require('../extensions-helpers')

module.exports.remoteInstall = async (req, res) => {
  const result = { extension: req.extension }

  if (Object.prototype.hasOwnProperty.call(req, 'dashboardExist') && req.dashboardExist === false) {
    result.message = req.t('DashboardNotExistCopyExtensionFilesManually')
  }
  aventum.cache.batchDeletionKeysByPattern('extensions:p:*')
  return res.send(result)
  // let data = {
  //   name: req.extension.name,
  //   description: req.extension.description,
  //   version: req.extension.version,
  //   author: req.extension.author,
  //   license: req.extension.license,
  //   target: req.extension.aventum.target,
  //   user: req.user._id
  // }
  // data = cleanObject(data)
  // var extension = new Extension(data)
  // extension.save().then(
  //   extension => {
  //     //Delete the cache of the GET /extensions, GET /extensions/all
  //     aventum.cache.batchDeletionKeysByPattern(`extensions:p:*`)
  //     res.send(extension)
  //   },
  //   e => {
  //     res.status(400).send(e)
  //   }
  // )
}

module.exports.post = async (req, res) => {
  const result = { extension: req.extension }

  if (Object.prototype.hasOwnProperty.call(req, 'dashboardExist') && req.dashboardExist === false) {
    result.message = req.t('DashboardNotExistCopyExtensionFilesManually')
  }

  aventum.cache.batchDeletionKeysByPattern('extensions:p:*')
  res.send(result)
  // let data = {
  //   name: req.extension.name,
  //   description: req.extension.description,
  //   version: req.extension.version,
  //   author: req.extension.author,
  //   license: req.extension.license,
  //   target: req.extension.aventum.target,
  //   user: req.user._id
  // }

  // data = cleanObject(data)

  // var extension = new Extension(data)

  // extension.save().then(
  //   extension => {
  //     //Delete the cache of the GET /extensions, GET /extensions/all
  //     aventum.cache.batchDeletionKeysByPattern(`extensions:p:*`)

  //     res.send(req.extension)
  //   },
  //   e => {
  //     res.status(400).send(e)
  //   }
  // )
}

module.exports.get = async (req, res) => {
  try {
    var result = await Extension.getExtensions(req)
    return res.send(result)
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getAll = async (req, res) => {
  try {
    var extensions = await Extension.getAllExtensions(req)

    return res.send(extensions)
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getActiveDashboard = async (req, res) => {
  try {
    var extensions = await Extension.getAllExtensions(req)

    extensions = extensions.filter(
      e => e.aventum.target === 'dashboard' && e.aventum.active
    )

    return res.send(extensions)
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getById = async (req, res) => {
  try {
    var extension = await Extension.getExtension(req.params.id)
    if (extension === null) {
      return res.status(404).send()
    }
    if (extension === 403) {
      return res.status(403).send()
    }
    return res.send({ extension })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.delete = async (req, res) => {
  try {
    var name = req.query.name

    var extensions = await Extension.getAllExtensions()

    var extension = extensions.find(e => e.name === name)

    var cacheKey = `extensions:g:${name}`

    var removeResult = await removeExtensionFiles(name)

    await Extension.deleteByName(name)

    aventum.cache.deleteKey(cacheKey)
    aventum.cache.batchDeletionKeysByPattern('extensions:p:*')

    await aventum.hooks.doAction('extensionDeleted', extension, req, res)

    const resObj = { extension }

    if (removeResult.message) {
      resObj.message = removeResult.message
    }

    res.send(resObj)
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.patch = async (req, res) => {
  try {
    var reqExtension = req.body.extension
    // To support @aventum/sample-server-extension and sample-server-extension package names
    // var extensionName = req.params.package ? req.params.org + '/' + req.params.package : req.params.org
    var extensionName = reqExtension.name
    var currentExtension = await Extension.getExtension(extensionName)

    var cacheKey = `extensions:g:${extensionName}`

    aventum.cache.deleteKey(cacheKey)
    aventum.cache.batchDeletionKeysByPattern('extensions:p:*')

    // If the extension exist then remove it(deactivate it)
    if (currentExtension) {
      var extension = await Extension.deleteByName(currentExtension.name)

      if (!extension) {
        return res.status(404).send()
      }

      reqExtension.aventum.active = false

      extension = reqExtension

      // extension.active = false

      aventum.hooks.doActionSync(
        'extensionDeactivatedSync',
        extension,
        req,
        res
      )

      await aventum.hooks.doAction('extensionDeactivated', extension, req, res)
    } else {
      const data = {
        name: extensionName
      }

      extension = new Extension(data)

      await extension.save()

      reqExtension.aventum.active = true

      extension = reqExtension

      aventum.hooks.doActionSync('extensionActivatedSync', extension, req, res)

      await aventum.hooks.doAction('extensionActivated', extension, req, res)
    }

    var result = await aventum.hooks.applyFilters(
      'sendPatchExtensionResponse',
      true,
      extension,
      req,
      res
    )

    if (result) {
      var response = { extension }
      response = await aventum.hooks.applyFilters(
        'patchExtensionResponse',
        response,
        req,
        res
      )
      res.send(response)
    }
  } catch (error) {
    res.status(400).send(error)
  }
}

module.exports.patchDashboardNotExist = async (req, res) => {
  await extensionNotExist(req, res)
}

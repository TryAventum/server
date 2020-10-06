var AdmZip = require('adm-zip')
var path = require('path')
const fse = require('fs-extra')
var { runNpmInstall, listExtensions } = require('../std-helpers')
var {
  getOptionValue
} = require('../helpers')

var installExtension = async (req, res, next) => {
  // The tmp folder path
  var tmpPath = req.tmpPath

  // Unzip the uploaded zip file
  var zip = new AdmZip(req.files[0].path)
  zip.extractAllTo(/* target path */ tmpPath, /* overwrite */ true)

  var zipFileName = req.files[0].originalname.slice(0, -4)

  var packageFile = listExtensions(
    `${tmpPath}${zipFileName}`
  )[0]

  // Here we assume that the zip file name equal to the name of the folder that inside it
  var extensionData = require(packageFile)

  var tmpExtensionDirectory = `${tmpPath}${extensionData.name}`
  try {
    var serverExtensionFolderPath = path.join(
      __dirname,
      `../content/extensions/${extensionData.name}`
    )

    var exists = await fse.pathExists(serverExtensionFolderPath)

    if (!exists) {
      await fse.copy(`${tmpExtensionDirectory}`, serverExtensionFolderPath)

      if (extensionData.aventum.target === 'server') {
        // If the extension has any dependencies then run `npm install`
        if (
          extensionData.dependencies &&
          Object.keys(extensionData.dependencies).length
        ) {
          await runNpmInstall(serverExtensionFolderPath)
        }
      } else {
        var DASHBOARD_ABS_PATH = await getOptionValue('DASHBOARD_ABS_PATH')
        var dashboardExist = await fse.pathExists(DASHBOARD_ABS_PATH)
        if (dashboardExist) {
          var dashboardExtensionFolderPath = `${DASHBOARD_ABS_PATH}/${
              process.env.NODE_ENV === 'development'
                ? 'public/content/extensions'
                : 'build/content/extensions'
            }/${extensionData.name}`

          exists = await fse.pathExists(dashboardExtensionFolderPath)
          if (!exists) {
            // Copy the folders to their appropriate location
            await fse.copy(`${tmpExtensionDirectory}`, dashboardExtensionFolderPath)
          }
        }
        req.dashboardExist = dashboardExist
      }
    }

    // Clean everything
    await fse.remove(tmpPath)

    if (exists) {
      throw new Error('Extension installed!')
    }

    extensionData.aventum.active = false
    extensionData.aventum.path = `${serverExtensionFolderPath}/package.json`.replace(aventum.dir, '')

    req.extension = extensionData
    next()
  } catch (err) {
    console.error(err)
    res.status(500).send()
  }
}

module.exports = { installExtension }

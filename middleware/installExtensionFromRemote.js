const uuidv1 = require('uuid/v1')
var path = require('path')
const fse = require('fs-extra')
const tar = require('tar')
const GitUrlParse = require('git-url-parse')
var validate = require('validate-npm-package-name')
var { runNpmInstall, runNpmPack, gitClone } = require('../std-helpers')
var { getOptionValue } = require('../helpers')

var installExtensionFromRemote = async (req, res, next) => {
  try {
    // The tmp folder path
    var tmpPath = path.join(__dirname, `../content/tmp/${uuidv1()}/`)

    await fse.ensureDir(tmpPath)

    req.body.type =
      validate(req.body.package).validForNewPackages &&
      validate(req.body.package).validForOldPackages
        ? 'npm'
        : 'git'

    var extensionData
    if (req.body.type === 'npm') {
      // Download the package to the tmp folder
      var packResult = await runNpmPack({
        package: req.body.package,
        cwd: tmpPath
      })

      // We get a linebreak with the package name/version so we remove it
      var packageNameVersion = packResult.replace(/(\r\n|\n|\r)/gm, '')

      // Extract the .tgz file in the tmp folder
      await tar.x({
        file: `${tmpPath}${packageNameVersion}`,
        C: `${tmpPath}`
      })

      // The extracted files will be in a "package" folder
      extensionData = require(`${tmpPath}/package/package.json`)

      // In case git is selected
    } else {
      // Clone to the tmp folder
      await gitClone({ url: req.body.package, path: tmpPath })

      // Get package details
      var packageName = GitUrlParse(req.body.package).name

      // The extracted files will be in a package folder
      extensionData = require(`${tmpPath}${packageName}/package.json`)
    }

    var tmpExtensionDirectory
    if (req.body.type === 'npm') {
      tmpExtensionDirectory = `${tmpPath}package`
    } else {
      tmpExtensionDirectory = `${tmpPath}${packageName}`
    }

    var serverExtensionFolderPath = path.join(
      __dirname,
      `../content/extensions/${extensionData.name}`
    )

    var exists = await fse.pathExists(serverExtensionFolderPath)
    if (!exists) {
      // Copy the extension files to the "extensions" folder
      if (req.body.type === 'npm') {
        // Here we are moving and renaming the "package" folder(which is the extension folder)
        await fse.move(tmpExtensionDirectory, serverExtensionFolderPath, {
          overwrite: true
        })
      } else {
        await fse.copy(tmpExtensionDirectory, serverExtensionFolderPath)
      }

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
            await fse.copy(serverExtensionFolderPath, dashboardExtensionFolderPath)
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
    extensionData.aventum.path = `${serverExtensionFolderPath}/package.json`.replace(
      aventum.dir,
      ''
    )

    req.extension = extensionData
    next()
  } catch (err) {
    console.error(err)
    res.status(500).send()
  }
}

module.exports = { installExtensionFromRemote }

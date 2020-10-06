var express = require('express')
const uuidv1 = require('uuid/v1')
var path = require('path')
var fse = require('fs-extra')
var router = express.Router()
var extensionsController = require('../controllers/extension')
var { authenticate } = require('../middleware/authenticate')
var { installExtension } = require('../middleware/installExtension')
var {
  installExtensionFromRemote
} = require('../middleware/installExtensionFromRemote')

var {
  updateExtension
} = require('../middleware/capabilities/extension/updateExtension')

var {
  deleteExtension
} = require('../middleware/capabilities/extension/deleteExtension')

var {
  readExtensions
} = require('../middleware/capabilities/extension/readExtensions')

var {
  readExtension
} = require('../middleware/capabilities/extension/readExtension')
var {
  createExtension
} = require('../middleware/capabilities/extension/createExtension')

var multer = require('multer')
// var mkdirp = require('mkdirp')

var storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    var dest = path.join(__dirname, `../content/tmp/${uuidv1()}/`)
    req.tmpPath = dest
    await fse.ensureDir(dest)
    // mkdirp(dest, function (err) {
    //   if (err) cb(err, dest)
    //   else cb(null, dest)
    // })
    cb(null, dest)
  },
  filename: function (req, file, cb) {
    // TODO validate file name
    cb(null, file.originalname)
  }
})

var upload = multer({ storage: storage })

router.post(
  '/remote-install',
  [authenticate, createExtension, installExtensionFromRemote],
  extensionsController.remoteInstall
)

router.post(
  '/',
  [authenticate, createExtension, upload.any(), installExtension],
  extensionsController.post
)

router.get('/', [authenticate, readExtensions], extensionsController.get)

router.get('/all', [authenticate, readExtensions], extensionsController.getAll)

router.get('/active-dashboard', extensionsController.getActiveDashboard)

router.get('/:id', [authenticate, readExtension], extensionsController.getById)

/**
 * We take the name from req.query in order to support @aventum/sample-server-extension
 * and sample-server-extension package names
 */
router.delete('/', [authenticate, deleteExtension], extensionsController.delete)

router.patch('/', [authenticate, updateExtension], extensionsController.patch)

router.patch(
  '/dashboard-not-exist',
  [authenticate, updateExtension],
  extensionsController.patchDashboardNotExist
)

module.exports = router

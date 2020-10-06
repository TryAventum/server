var express = require('express')
var router = express.Router()
var { authenticate } = require('../middleware/authenticate')
var { reservedCapabilities } = require('../middleware/reservedCapabilities')
var capabilitiesController = require('../controllers/capability')

var {
  updateCapability
} = require('../middleware/capabilities/capability/updateCapability')
var {
  mustUpdateOthersCapability
} = require('../middleware/capabilities/capability/mustUpdateOthersCapability')
var {
  mustDeleteOthersCapability
} = require('../middleware/capabilities/capability/mustDeleteOthersCapability')
var {
  deleteCapability
} = require('../middleware/capabilities/capability/deleteCapability')
var {
  readCapabilities
} = require('../middleware/capabilities/capability/readCapabilities')
var {
  markReadOthersCapability
} = require('../middleware/capabilities/capability/markReadOthersCapability')
var {
  readCapability
} = require('../middleware/capabilities/capability/readCapability')
var {
  createCapability
} = require('../middleware/capabilities/capability/createCapability')
var {
  markReadOthersCapabilities
} = require('../middleware/capabilities/capability/markReadOthersCapabilities')

// router.get(
//   '/',
//   [authenticate, readCapabilities, markReadOthersCapabilities],
//   capabilitiesController.get
// )

router.post('/', [authenticate, createCapability], capabilitiesController.post)

router.get(
  '/all',
  [authenticate, readCapabilities, markReadOthersCapabilities],
  capabilitiesController.getAll
)

router.get(
  '/:id',
  [authenticate, readCapability, markReadOthersCapability],
  capabilitiesController.getById
)

router.delete(
  '/:id',
  [authenticate, deleteCapability, reservedCapabilities, mustDeleteOthersCapability],
  capabilitiesController.deleteById
)

router.patch(
  '/:id',
  [authenticate, updateCapability, reservedCapabilities, mustUpdateOthersCapability],
  capabilitiesController.patchById
)

module.exports = router

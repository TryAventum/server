var express = require('express')
var router = express.Router()

var rolesController = require('../controllers/role')
var { authenticate } = require('../middleware/authenticate')

var { updateRole } = require('../middleware/capabilities/role/updateRole')
var { reservedRoles } = require('../middleware/reservedRoles')
var {
  mustUpdateOthersRole
} = require('../middleware/capabilities/role/mustUpdateOthersRole')
var {
  mustDeleteOthersRole
} = require('../middleware/capabilities/role/mustDeleteOthersRole')
var { deleteRole } = require('../middleware/capabilities/role/deleteRole')
var { readRoles } = require('../middleware/capabilities/role/readRoles')
var {
  markReadOthersRole
} = require('../middleware/capabilities/role/markReadOthersRole')
var { readRole } = require('../middleware/capabilities/role/readRole')
var { createRole } = require('../middleware/capabilities/role/createRole')
var {
  markReadOthersRoles
} = require('../middleware/capabilities/role/markReadOthersRoles')

router.get(
  '/',
  [authenticate, readRoles, markReadOthersRoles],
  rolesController.get
)

router.post('/', [authenticate, createRole], rolesController.post)

router.get(
  '/all',
  [authenticate, readRoles, markReadOthersRoles],
  rolesController.getAll
)

router.get(
  '/:id',
  [authenticate, readRole, markReadOthersRole],
  rolesController.getById
)

router.delete(
  '/:id',
  [authenticate, deleteRole, reservedRoles, mustDeleteOthersRole],
  rolesController.deleteById
)

router.patch(
  '/:id',
  [authenticate, updateRole, reservedRoles, mustUpdateOthersRole],
  rolesController.patchById
)

module.exports = router

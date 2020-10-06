var express = require('express')
var router = express.Router()
var fieldsController = require('../controllers/field')
var { authenticate } = require('../middleware/authenticate')
var {
  markReadOthersCustomFields
} = require('../middleware/capabilities/customField/markReadOthersCustomFields')
var {
  markReadOthersCustomField
} = require('../middleware/capabilities/customField/markReadOthersCustomField')
var {
  mustDeleteOthersCustomField
} = require('../middleware/capabilities/customField/mustDeleteOthersCustomField')
var {
  mustUpdateOthersCustomField
} = require('../middleware/capabilities/customField/mustUpdateOthersCustomField')
var {
  readCustomFields
} = require('../middleware/capabilities/customField/readCustomFields')
var {
  readCustomField
} = require('../middleware/capabilities/customField/readCustomField')
var {
  createCustomField
} = require('../middleware/capabilities/customField/createCustomField')
var {
  updateCustomField
} = require('../middleware/capabilities/customField/updateCustomField')
var {
  deleteCustomField
} = require('../middleware/capabilities/customField/deleteCustomField')

router.get(
  '/',
  [authenticate, readCustomFields, markReadOthersCustomFields],
  fieldsController.get
)

router.post('/', [authenticate, createCustomField], fieldsController.post)

router.get('/all', authenticate, fieldsController.getAll)

router.get(
  '/:id',
  [authenticate, readCustomField, markReadOthersCustomField],
  fieldsController.getById
)

router.delete(
  '/:id',
  [authenticate, deleteCustomField, mustDeleteOthersCustomField],
  fieldsController.deleteById
)

router.patch(
  '/:id',
  [authenticate, updateCustomField, mustUpdateOthersCustomField],
  fieldsController.patchById
)

module.exports = router

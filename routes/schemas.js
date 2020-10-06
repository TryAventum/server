var express = require('express')
var router = express.Router()
var schemasController = require('../controllers/schema')

var { authenticate } = require('../middleware/authenticate')
var { filterSchemaData } = require('../middleware/filterSchemaData')
var { createSchema } = require('../middleware/capabilities/schema/createSchema')
var { readSchemas } = require('../middleware/capabilities/schema/readSchemas')
var { deleteSchema } = require('../middleware/capabilities/schema/deleteSchema')
var {
  mustDeleteOthersSchema
} = require('../middleware/capabilities/schema/mustDeleteOthersSchema')
var { updateSchema } = require('../middleware/capabilities/schema/updateSchema')
var {
  mustUpdateOthersSchema
} = require('../middleware/capabilities/schema/mustUpdateOthersSchema')
var {
  markReadOthersSchemas
} = require('../middleware/capabilities/schema/markReadOthersSchemas')
var { readSchema } = require('../middleware/capabilities/schema/readSchema')
var {
  markReadOthersSchema
} = require('../middleware/capabilities/schema/markReadOthersSchema')

/**
 * The user must have `readSchemas` capability to be able to get all the schemas
 * then if the user has `readOthersSchemas` capability he/she will receive all the
 * schemas otherwise she/he will receive only her/his schemas. SO `readSchemas`
 * allow the user to list only his/her schemas.
 */
router.get(
  '/',
  [authenticate, readSchemas, markReadOthersSchemas],
  schemasController.get
)

router.post(
  '/',
  [authenticate, createSchema, filterSchemaData],
  schemasController.post
)

router.get('/all', authenticate, schemasController.getAll)

router.get(
  '/:id',
  [authenticate, readSchema, markReadOthersSchema],
  schemasController.getById
)

router.delete(
  '/:id',
  [authenticate, deleteSchema, mustDeleteOthersSchema],
  schemasController.deleteById
)

router.patch(
  '/:id',
  [authenticate, updateSchema, mustUpdateOthersSchema, filterSchemaData],
  schemasController.patchById
)

module.exports = router

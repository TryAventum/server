var express = require('express')
var router = express.Router()
var { authenticate } = require('../middleware/authenticate')
var optionsController = require('../controllers/option')
var { readOptions } = require('../middleware/capabilities/option/readOptions')
var {
  updateOptions
} = require('../middleware/capabilities/option/updateOptions')

router.get('/all', [authenticate, readOptions], optionsController.getAll)

router.get('/public', optionsController.getPublic)

router.get(
  '/flushAllCache',
  [authenticate, updateOptions],
  optionsController.getFlushAllCache
)

router.patch('/', [authenticate, updateOptions], optionsController.patch)

module.exports = router

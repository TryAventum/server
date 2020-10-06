var express = require('express')
var router = express.Router()
var { authenticate } = require('../middleware/authenticate')
var translationsController = require('../controllers/translation')

var {
  readTranslations
} = require('../middleware/capabilities/translation/readTranslations')
var {
  updateTranslations
} = require('../middleware/capabilities/translation/updateTranslations')

router.get(
  '/all',
  [authenticate, readTranslations],
  translationsController.getAll
)

router.put('/', [authenticate, updateTranslations], translationsController.put)

module.exports = router

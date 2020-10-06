var express = require('express')
var router = express.Router()

var notificationsController = require('../controllers/notification')

var { authenticate } = require('../middleware/authenticate')

router.get('/', [authenticate], notificationsController.get)

router.post('/', [authenticate], notificationsController.post)

router.get('/:id', [authenticate], notificationsController.getById)

router.delete('/:id', [authenticate], notificationsController.deleteById)

router.patch('/:id', [authenticate], notificationsController.patchById)

module.exports = router

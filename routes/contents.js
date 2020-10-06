var express = require('express')
var router = express.Router()

var contentsController = require('../controllers/content')
var { createContent } = require('../middleware/content/createContent')
var { readContent } = require('../middleware/content/readContent')
var { updateContent } = require('../middleware/content/updateContent')
var { deleteContent } = require('../middleware/content/deleteContent')

router.get('/:content', readContent, contentsController.get)

router.post('/:content', createContent, contentsController.post)

router.get('/:content/all', readContent, contentsController.getAll)

router.get('/:content/:id', readContent, contentsController.getById)

router.delete('/:content/:id', deleteContent, contentsController.deleteById)

router.patch('/:content/:id', updateContent, contentsController.patchById)

module.exports = router

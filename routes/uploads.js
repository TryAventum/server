var express = require('express')

var extname = require('path').extname

var router = express.Router()
var { authenticate } = require('../middleware/authenticate')
// var { authenticateURL } = require('../middleware/authenticateURL')
const uuidv1 = require('uuid/v1')

var { createUpload } = require('../middleware/capabilities/upload/createUpload')
var { deleteUpload } = require('../middleware/capabilities/upload/deleteUpload')
// var { readUploads } = require('../middleware/capabilities/upload/readUploads')
// var {
//   markReadOthersUploads,
// } = require('../middleware/capabilities/upload/markReadOthersUploads')
var {
  mustDeleteOthersUpload,
} = require('../middleware/capabilities/upload/mustDeleteOthersUpload')

var uploadsController = require('../controllers/upload')

var { getOptionValue } = require('../helpers')

var multer = require('multer')
var fse = require('fs-extra')

var storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    // var code = JSON.parse(req.body.model).empCode;
    var year = new Date().getFullYear()
    var month = ('0' + (new Date().getMonth() + 1)).slice(-2)
    const filePath = `${year}/${month}/`
    var UPLOADS_PUBLIC_PATH = await getOptionValue('UPLOADS_PUBLIC_PATH')
    var dest = `${UPLOADS_PUBLIC_PATH}${filePath}`
    await fse.ensureDir(dest)
    // mkdirp(dest, function (err) {
    //   if (err) cb(err, dest)
    //   else cb(null, dest)
    // })
    req.filePath = filePath
    cb(null, dest)
  },
  filename: function (req, file, cb) {
    cb(null, uuidv1() + extname(file.originalname))
  },
})

var upload = multer({ storage: storage })

/**
 * Starting the routes section
 */
router.post(
  '/',
  [authenticate, createUpload, upload.any()],
  uploadsController.post
)

router.get('/', uploadsController.get)

router.get('/all', uploadsController.getAll)

router.get('/:id', uploadsController.getById)

router.delete(
  '/:id',
  [authenticate, deleteUpload, mustDeleteOthersUpload],
  uploadsController.deleteById
)

module.exports = router

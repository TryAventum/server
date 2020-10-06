var resolve = require('path').resolve
var Upload = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/upload' : '../models/sql/upload')
const { UploadsHelper } = require('../packages/uploads-helper/index')
var { deleteFiles } = require('../std-helpers')

module.exports.post = function (req, res) {
  Upload.createUpload({
    path: req.filePath + req.files[0].filename,
    originalName: req.files[0].originalname,
    createdBy: req.user.id,
    updatedBy: req.user.id
  }).then(
    doc => {
      var leanObject = doc
      UploadsHelper.setUploadURL(leanObject, req).then(upload => {
        res.send(upload)
      })
    },
    e => {
      res.status(400).send(e)
    }
  )

  // res.send(req.files);
  // console.log(req.body);
}

module.exports.get = async (req, res) => {
  try {
    var result = await Upload.getUploads(
      req,
      req.readOthersUploads ? null : req.user
    )
    return res.send(result)
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getAll = async (req, res) => {
  try {
    var result = await Upload.getAllUploads(
      req,
      req.readOthersUploads ? null : req.user
    )
    return res.send(result)
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getById = (req, res) => {
  var id = req.params.id

  Upload.getUpload(id)
    .then(upload => {
      if (!upload) {
        return res.status(404).send()
      }

      return res.send(upload)
    })
    .catch(e => {
      res.status(400).send()
    })
}

module.exports.deleteById = async (req, res) => {
  var id = req.params.id

  try {
    const upload = await Upload.getUpload(id, false)

    if (!upload) {
      return res.status(404).send()
    }

    await Upload.deleteById(id)

    // Delete the file
    deleteFiles([resolve(`content/public/uploads/${upload.path}`)])
      .then(() => {
        // successfully deleted
        return res.send({ upload })
      })
      .catch(e => {
        return res.status(500).send()
      })
  } catch (error) {
    console.log(error)
    res.status(400).send()
  }
}

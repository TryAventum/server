var mongoose = require('mongoose')
const { ObjectID } = require('mongodb')
const { Paginator } = require('../../packages/paginator/index')
var { getStringID } = require('../../std-helpers')
var { UploadsHelper } = require('../../packages/uploads-helper/index')
var { queryParser } = require('../../helpers')

var UploadSchema = new mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
      trim: true
    },
    originalName: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 250,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  {
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true
    }
  }
)

UploadSchema.statics.createUpload = async function (values) {
  try {
    const Upload = this

    var upload = new Upload(values)

    upload = await upload.save()

    aventum.cache.batchDeletionKeysByPattern('uploads:p:*')

    return upload.toObject()
  } catch (error) {
    throw new Error(error)
  }
}

UploadSchema.statics.getUploads = async function (req, user = null) {
  var cacheKey = `uploads:p:${req.originalUrl}`

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (error) {
    try {
      // No cache found
      var Upload = this
      var page = +req.query.page
      var query = req.query.query ? JSON.parse(req.query.query) : {}

      if (user) {
        if (query.where) {
          query.where.createdBy = user._id
        } else {
          query.where = { createdBy: user._id }
        }
      }

      query = queryParser(query)

      var count = await Upload.countDocuments(query).exec()
      const paginatorInstance = new Paginator(page, 20, count)

      // if (!paginatorInstance.hasNextPage() && page !== 1) {
      //     return ({ uploads: [] });
      // }

      var uploads = await Upload.find(query)
        .sort({ _id: -1 })
        .skip(paginatorInstance.offset())
        .limit(paginatorInstance.perPage)
        .exec()

      uploads = uploads.map(function (d) {
        return d.toObject()
      })
      uploads = await UploadsHelper.setUploadsPublicURL(uploads)
      const ress = {
        uploads,
        pagination: {
          totalPages: paginatorInstance.totalPages(),
          perPage: paginatorInstance.perPage,
          totalCount: paginatorInstance.totalCount
        }
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, ress)

      return ress
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }
}

UploadSchema.statics.deleteById = async function (id) {
  var Upload = this

  if (!ObjectID.isValid(id)) {
    return null
  }

  try {
    const upload = await Upload.findOneAndRemove({
      _id: id
    })

    aventum.cache.deleteKey(`uploads:g:${id}`)
    aventum.cache.batchDeletionKeysByPattern('uploads:p:*')

    return upload
  } catch (error) {
    console.log(error)

    return null
  }
}

UploadSchema.statics.getAllUploads = async function (req, user = null) {
  var cacheKey = `uploads:p:${req.originalUrl}`

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (error) {
    // No cache found
    try {
      var Upload = this
      var query = req.query.query ? JSON.parse(req.query.query) : {}

      if (user) {
        if (query.where) {
          query.where.createdBy = user._id
        } else {
          query.where = { createdBy: user._id }
        }
      }

      query = queryParser(query)

      var uploads = await Upload.find(query)
        .sort({ _id: -1 })
        .exec()

      uploads = uploads.map(function (d) {
        return d.toObject()
      })

      uploads = await UploadsHelper.setUploadsPublicURL(uploads)
      const ress = {
        uploads
      }

      aventum.cache.cacheByKey(cacheKey, ress)

      return ress
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }
}

UploadSchema.statics.getUpload = async function (_id, setURL = true) {
  var Upload = this

  var cacheKey = `uploads:g:${_id}`

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    try {
      var upload = await Upload.findOne({
        _id
      })

      if (!upload) {
        return null
      }

      if (setURL) {
        upload = await UploadsHelper.setPublicURL(upload)
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, upload)

      return upload
    } catch (error) {
      console.log(e)
      throw new Error(error)
    }
  }
}

var Upload = mongoose.model('Upload', UploadSchema)

module.exports = Upload

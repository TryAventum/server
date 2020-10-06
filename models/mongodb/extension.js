var mongoose = require('mongoose')

const { Paginator } = require('../../packages/paginator/index')

var ExtensionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 250,
      unique: true,
      trim: true
    },
    createdAt: { type: Date, default: Date.now }
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

ExtensionSchema.statics.getExtensions = async function (req, user = null) {
  var Extension = this

  const page = +req.query.page
  const searchTerm = req.query.q
  let query = {}

  if (searchTerm) {
    query = { label: { $regex: '.*' + searchTerm + '.*', $options: 'i' } }
  }

  if (user) {
    query.user = user._id
  }

  var cacheKey
  if (user) {
    cacheKey = `extensions:p:${user._id}:` + req.originalUrl
  } else {
    cacheKey = 'extensions:p:' + req.originalUrl
  }

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var count = await Extension.countDocuments(query).exec()
      const paginatorInstance = new Paginator(page, 20, count)

      var extensions = await Extension.find(query)
        .sort({ _id: -1 })
        .skip(paginatorInstance.offset())
        .limit(paginatorInstance.perPage)
        .exec()

      var ress = {
        extensions,
        pagination: {
          totalPages: paginatorInstance.totalPages(),
          perPage: paginatorInstance.perPage,
          totalCount: paginatorInstance.totalCount
        }
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, ress)

      return ress
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

ExtensionSchema.statics.deleteByName = async function (name) {
  const Extension = this
  try {
    var extension = await Extension.findOneAndRemove({
      name
    })

    return extension
  } catch (error) {
    console.log(error)
    return null
  }
}

ExtensionSchema.statics.getAllExtensions = async function (
  req = null,
  user = null
) {
  var Extension = this

  var cacheKey = 'extensions:p:all'

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var { getAllExtensions } = require('../../extensions-helpers')

      var activeExtensions = await Extension.find({})
        .sort({ _id: -1 })
        .exec()

      var extensions = await getAllExtensions(activeExtensions)

      return extensions
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

ExtensionSchema.statics.getExtension = async function (name) {
  var Extension = this

  var cacheKey = `extensions:g:${name}`

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var extension = await Extension.findOne({
        name
      }).exec()

      if (!extension) {
        return null
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, extension)

      return extension
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

// ExtensionSchema.statics.deactivateExtension = async function(name) {
//   var Extension = this

//   var cacheKey = `extensions:g:${name}`

//   try {
//     var reqExtension = { name }

//     var extensionName = reqExtension.name

//     var cacheKey = `extensions:g:${extensionName}`

//     aventum.cache.deleteKey(cacheKey)
//     aventum.cache.batchDeletionKeysByPattern(`extensions:p:*`)

//     var extension = await Extension.findOneAndRemove({
//       name
//     })

//     if (!extension) {
//       return 404
//     }

//     if (reqExtension['aventum']) {
//       reqExtension.aventum.active = false
//       reqExtension.aventum.target = null
//     } else {
//       reqExtension.aventum = {}
//       reqExtension.aventum.active = false
//       reqExtension.aventum.target = null
//     }

//     extension = reqExtension

//     // extension.active = false

//     aventum.hooks.doActionSync('extensionDeactivatedSync', extension, req, res)

//     await aventum.hooks.doAction('extensionDeactivated', extension, req, res)

//     var result = await aventum.hooks.applyFilters(
//       'sendPatchExtensionResponse',
//       true,
//       extension,
//       req,
//       res
//     )

//     if (result) {
//       var response = { extension }
//       response = await aventum.hooks.applyFilters(
//         'patchExtensionResponse',
//         response,
//         req,
//         res
//       )
//       res.send(response)
//     }
//   } catch (error) {
//     console.log(e)
//     throw new Error(e)
//   }
// }

var Extension = mongoose.model('Extension', ExtensionSchema)

module.exports = Extension

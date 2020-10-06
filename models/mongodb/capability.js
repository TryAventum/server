var mongoose = require('mongoose')
const { ObjectID } = require('mongodb')
const { Paginator } = require('../../packages/paginator/index')
var { getStringID } = require('../../std-helpers')

var CapabilitySchema = new mongoose.Schema(
  {
    label: {
      type: String,
      minlength: 1,
      maxlength: 250,
      trim: true
    },
    name: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 250,
      unique: true,
      trim: true
    },
    reserved: {
      type: Boolean,
      default: false
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

CapabilitySchema.statics.updateCapability = async function (options) {
  var Capability = this

  try {
    const capability = await Capability.findOneAndUpdate(
      { _id: options.id },
      { $set: options.values },
      { new: true, runValidators: true }
    )

    return capability
  } catch (error) {
    console.log(error)
    return null
  }
}

CapabilitySchema.statics.deleteById = async function (id) {
  var Capability = this

  if (!ObjectID.isValid(id)) {
    return null
  }

  try {
    const capability = await Capability.findOneAndRemove({
      _id: id
    })

    return capability
  } catch (error) {
    console.log(error)

    return null
  }
}

CapabilitySchema.statics.getCapabilities = async function (req, user = null) {
  var Capability = this

  const page = +req.query.page
  const searchTerm = req.query.q
  let query = {}

  if (searchTerm) {
    query = { label: { $regex: '.*' + searchTerm + '.*', $options: 'i' } }
  }

  if (user) {
    query.createdBy = user._id
  }

  var cacheKey
  if (user) {
    cacheKey = `capabilities:p:${user._id}:` + req.originalUrl
  } else {
    cacheKey = 'capabilities:p:' + req.originalUrl
  }

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var count = await Capability.countDocuments(query).exec()
      const paginatorInstance = new Paginator(page, 20, count)

      var capabilities = await Capability.find(query)
        .sort({ _id: -1 })
        .skip(paginatorInstance.offset())
        .limit(paginatorInstance.perPage)
        .exec()

      var ress = {
        capabilities,
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

CapabilitySchema.statics.bulkInsertRows = async function (rows) {
  const Capability = this

  // setup the capabilities table and get all the capabilities
  const capabilitiesDocuments = await Capability.insertMany(rows)

  return capabilitiesDocuments
}

CapabilitySchema.statics.getAllCapabilities = async function (req, user = null) {
  var Capability = this

  var cacheKey
  if (user) {
    cacheKey = `capabilities:p:all:${user._id}`
  } else {
    cacheKey = 'capabilities:p:all'
  }

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      const query = {}
      if (user) {
        query.createdBy = user._id
      }
      var capabilities = await Capability.find(query)
        .sort({ _id: -1 })
        .exec()

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, capabilities)

      return capabilities
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

// CapabilitySchema.statics.getAllCapabilities = async function(user = null) {
//   var Capability = this

//   if (user) {
//     var cacheKey = `capabilities:p:all:${user._id}`
//   } else {
//     var cacheKey = 'capabilities:p:all'
//   }

//   try {
//     //Check do we have a cache
//     var result = await aventum.cache.getByKey(cacheKey)
//     //We found the cache
//     return result
//   } catch (e) {
//     //No cache found
//     try {
//       let query = {}
//       if (user) {
//         query.createdBy = user._id
//       }
//       var capabilities = await Capability.find(query)
//         .sort({ _id: -1 })
//         .exec()

//       //Cache this value
//       aventum.cache.cacheByKey(cacheKey, capabilities)

//       return capabilities
//     } catch (e) {
//       console.log(e)
//       throw new Error(e)
//     }
//   }
// }

CapabilitySchema.statics.getCapability = async function (_id, user = null) {
  var Capability = this

  var cacheKey = `capabilities:g:${_id}`

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var capability = await Capability.findOne({
        _id
      }).exec()

      if (!capability) {
        return null
      }

      if (user && getStringID(user._id) !== getStringID(capability.createdBy)) {
        return 403
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, capability)

      return capability
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

var Capability = mongoose.model('Capability', CapabilitySchema)

module.exports = Capability

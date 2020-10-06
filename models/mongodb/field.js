var mongoose = require('mongoose')
const { ObjectID } = require('mongodb')
const { Paginator } = require('../../packages/paginator/index')
var { getStringID } = require('../../std-helpers')

var FieldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      required: true
    },
    title: {
      type: String
    },
    singularTitle: {
      type: String
    },
    fields: {
      type: String
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

FieldSchema.statics.updateField = async function (options) {
  var Field = this

  try {
    const field = await Field.findOneAndUpdate(
      { _id: options.id },
      { $set: options.values },
      { new: true, runValidators: true }
    )

    return field
  } catch (error) {
    console.log(error)
    return null
  }
}

FieldSchema.statics.deleteById = async function (id) {
  var Field = this

  if (!ObjectID.isValid(id)) {
    return null
  }

  try {
    const field = await Field.findOneAndRemove({
      _id: id
    })

    return field
  } catch (error) {
    console.log(error)

    return null
  }
}

FieldSchema.statics.getFields = async function (req, user = null) {
  var Field = this

  const page = +req.query.page
  const searchTerm = req.query.q
  let query = {}

  if (searchTerm) {
    query = { title: { $regex: '.*' + searchTerm + '.*', $options: 'i' } }
  }

  if (user) {
    query.createdBy = user._id
  }

  var cacheKey
  if (user) {
    cacheKey = `fields:p:${user._id}:` + req.originalUrl
  } else {
    cacheKey = 'fields:p:' + req.originalUrl
  }

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var count = await Field.countDocuments(query).exec()
      const paginatorInstance = new Paginator(page, 20, count)

      var fields = await Field.find(query)
        .sort({ _id: -1 })
        .skip(paginatorInstance.offset())
        .limit(paginatorInstance.perPage)
        .exec()

      var ress = {
        fields,
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

FieldSchema.statics.createField = async function (values) {
  const Field = this
  try {
    var field = new Field(values)

    field = await field.save()

    return field
  } catch (error) {
    throw new Error(error)
  }
}

FieldSchema.statics.getAllFields = async function (req = null, user = null) {
  var Field = this

  var cacheKey
  if (user) {
    cacheKey = `fields:p:all:${user._id}`
  } else {
    cacheKey = 'fields:p:all'
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
      var fields = await Field.find(query)
        .sort({ _id: -1 })
        .exec()

      fields = fields.map(f => {
        const j = f.toObject()
        j.fields = JSON.parse(j.fields)

        return j
      })

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, fields)

      return fields
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

FieldSchema.statics.getField = async function (_id, user = null) {
  var Field = this

  var cacheKey = `fields:g:${_id}`

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var field = await Field.findOne({
        _id: _id
      }).exec()

      if (!field) {
        return null
      }

      if (user && getStringID(user._id) !== getStringID(field.createdBy)) {
        return 403
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, field)

      return field
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

FieldSchema.statics.getFieldByName = async function (name, user = null) {
  var Field = this

  var cacheKey = `fields:g:${name}`

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var allCustomFields = await Field.getAllFields()

      const field = allCustomFields.find(s => s.name === name)

      if (!field) {
        return null
      }

      if (user && getStringID(user._id) !== getStringID(field.createdBy)) {
        return 403
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, field)

      return field
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

var Field = mongoose.model('Field', FieldSchema)

module.exports = Field

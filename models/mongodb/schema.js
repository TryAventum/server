var mongoose = require('mongoose')
const { ObjectID } = require('mongodb')
const { Paginator } = require('../../packages/paginator/index')
var { getStringID } = require('../../std-helpers')
var isUndefined = require('lodash/fp/isUndefined')
var isNull = require('lodash/fp/isNull')
var omitBy = require('lodash/fp/omitBy')
var flow = require('lodash/fp/flow')

var SchemaSchema = new mongoose.Schema(
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
    icon: {
      type: String
    },
    fields: {
      type: String
    },
    acl: {
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

SchemaSchema.statics.addSchema = async function (req) {
  try {
    req.body.createdBy = req.user.id
    req.body.updatedBy = req.user.id

    req.body = flow(
      omitBy(isUndefined),
      omitBy(isNull)
    )(req.body)

    var schema = new Schema(req.body)

    schema = await schema.save()

    return schema
  } catch (error) {
    console.log(error)

    return null
  }
}

SchemaSchema.statics.getAllSchemas = async function (user = null) {
  var Schema = this

  var cacheKey
  if (user) {
    cacheKey = `schemas:p:all:${user._id}`
  } else {
    cacheKey = 'schemas:p:all'
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
      var schemas = await Schema.find(query)
        // .lean()
        .sort({ _id: -1 })
        .exec()

      schemas = schemas.map(s => {
        const o = s.toObject()
        o.fields = o.fields && typeof o.fields === 'string' ? JSON.parse(o.fields) : null
        o.acl = o.acl && typeof o.acl === 'string' ? JSON.parse(o.acl) : null

        return o
      })

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, schemas)

      return schemas
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

SchemaSchema.statics.getSchemas = async function (req, user = null) {
  var Schema = this

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
    cacheKey = `schemas:p:${user._id}:` + req.originalUrl
  } else {
    cacheKey = 'schemas:p:' + req.originalUrl
  }

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var count = await Schema.countDocuments(query).exec()
      const paginatorInstance = new Paginator(page, 20, count)

      var schemas = await Schema.find(query)
        .sort({ _id: -1 })
        .skip(paginatorInstance.offset())
        .limit(paginatorInstance.perPage)
        .exec()

      var ress = {
        schemas,
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

SchemaSchema.statics.getSchemaByContent = async function (content, user = null) {
  try {
    const allSchemas = await this.getAllSchemas()

    const schema = allSchemas.find(s => s.name === content)

    if (user && getStringID(user.id) !== getStringID(schema.createdBy)) {
      return 403
    }

    return schema
  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

SchemaSchema.statics.deleteById = async function (_id) {
  try {
    const schema = await Schema.findOneAndRemove({
      _id
    })

    return schema
  } catch (error) {
    console.log(error)

    return null
  }
}

SchemaSchema.statics.updateSchema = async function (options) {
  var Schema = this

  try {
    const schema = await Schema.findOneAndUpdate(
      { _id: options.id },
      { $set: options.values },
      { new: true, runValidators: true }
    )

    return schema
  } catch (error) {
    console.log(error)
    return null
  }
}

SchemaSchema.statics.getSchema = async function (_id, user = null) {
  if (!ObjectID.isValid(_id)) {
    return null
  }

  var cacheKey = `schemas:g:${_id}`

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      const allSchemas = await this.getAllSchemas()

      const schema = allSchemas.find(s => s._id === _id)

      if (!schema) {
        return null
      }

      if (user && getStringID(user._id) !== getStringID(schema.createdBy)) {
        return 403
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, schema)

      return schema
    } catch (e) {
      console.log(e)
      return null
    }
  }
}

var Schema = mongoose.model('Schema', SchemaSchema)

module.exports = Schema

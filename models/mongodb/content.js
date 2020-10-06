const Joi = require('@hapi/joi')
var Field = require('./field')
var Schema = require('./schema')
const { ObjectID } = require('mongodb')
const { Paginator } = require('../../packages/paginator/index')
var ContentValidator = require('../../packages/content-validator')
var isUndefined = require('lodash/fp/isUndefined')
var omitBy = require('lodash/fp/omitBy')
var flow = require('lodash/fp/flow')

module.exports.getValidSchema = async function (content) {
  /**
   * //////////////////////////////////////////////////////////////
   *
   * We cant cache String, mongoose.Schema.Types.ObjectId using redis so we
   * are going to cache is as string, ObjectId strings(placeholders) then each
   * time we return the schema we replace it by String, mongoose.Schema.Types.ObjectId
   *
   * //////////////////////////////////////////////////////////////
   */

  var cacheKey = `contentSchema:g:${content}`

  var { setRealTypes } = require('../../std-helpers')

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    result.schema = setRealTypes(result.schema)
    return result
  } catch (e) {
    // No cache found
    try {
      var theContent = await Schema.getSchemaByContent(content)

      if (!theContent) {
        throw aventum.i18n.t('NoContentFound')
      }

      // theContent = theContent.toObject()

      const fieldsPromises = theContent.fields.map(async f => {
        const obj = {}

        if (f.type === 'custom') {
          var field = await Field.getFieldByName(f.name)

          if (!field) {
            return null
          }

          // field = field.toObject()

          const isCustomFieldRepeatable = f.repeatable

          const handeledFeilds = field.fields.map(e => {
            const subObj = {}
            const name = e.name

            let type
            switch (e.type) {
              case 'select':
                type = 'string'
                break
              case 'textarea':
                type = 'string'
                break
              case 'upload':
                type = 'ObjectId'
                break
              default:
                type = e.type
                break
            }

            // const required = e.required
            let repeatable = e.repeatable

            repeatable =
              typeof repeatable === 'object' ? repeatable.checked : repeatable

            const temp = { type }

            // Add Population Support
            if (e.type === 'upload') {
              temp.ref = 'Upload'
            } else if (type === 'relation') {
              temp.ref = e.name.capitalize()
            }

            if (repeatable) {
              subObj[name] = [temp]
            } else {
              subObj[name] = temp
            }

            return subObj
          })

          let embeddedDocument = {}

          for (const i of handeledFeilds) {
            embeddedDocument = { ...embeddedDocument, ...i }
          }

          obj[f.name] = isCustomFieldRepeatable
            ? [embeddedDocument]
            : embeddedDocument

          // const required = f.fields.find(h => h.name === 'required').checked
        } else {
          const name = f.name
          let type
          switch (f.type) {
            case 'select':
              type = 'string'
              break
            case 'textarea':
              type = 'string'
              break
            case 'upload':
              type = 'ObjectId'
              break
            default:
              type = f.type
              break
          }
          // const required = f.required
          const repeatable = type !== 'boolean' ? f.repeatable : false

          const temp = { type }

          // Add Population Support
          if (f.type === 'upload') {
            temp.ref = 'Upload'
          } else if (type === 'relation') {
            temp.ref = f.name.capitalize()
          }

          if (repeatable) {
            obj[name] = [temp]
          } else {
            obj[name] = temp
          }
        }

        return obj
      })

      var fields = await Promise.all(fieldsPromises)

      // Remove the not existing custom fields
      fields = fields.filter(f => f !== null)

      let schema = {}

      for (const oo of fields) {
        schema = { ...schema, ...oo }
      }

      schema.status = {
        type: 'string'
      }
      schema.trash = {
        type: 'boolean'
      }

      schema.createdBy = {
        type: 'ObjectId'
      }
      schema.updatedBy = {
        type: 'ObjectId'
      }

      schema.createdAt = {
        type: 'date'
      }
      schema.updatedAt = {
        type: 'date'
      }

      const schemaDetails = {
        title: theContent.title,
        singularTitle: theContent.singularTitle,
        name: theContent.name,
        icon: theContent.icon,
        createdBy: theContent.createdBy,
        acl: theContent.acl
      }

      var ress = {
        schema,
        schemaDetails,
        virtuals: {
          toObject: {
            virtuals: true
          },
          toJSON: {
            virtuals: true
          }
        }
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, ress)

      ress.schema = setRealTypes(ress.schema)

      return ress
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

module.exports.getMongooseSchemaMethods = function () {
  return {
    statics: {
      async getContents (req) {
        var {
          getMongoDBSortByStyle,
          queryParser,
          getMongoDBSortOrderStyle
        } = require('../../helpers')

        try {
          const model = this

          const page = +req.query.page || 1
          const perPage = +req.query.perPage || 20
          var query = req.query.query ? JSON.parse(req.query.query) : {}
          var sortBy = query.sortBy
            ? getMongoDBSortByStyle(query.sortBy)
            : '_id'
          var sortOrder = query.sortOrder
            ? getMongoDBSortOrderStyle(query.sortOrder)
            : -1

          if (req.returnedDataRestriction === 'ownedData') {
            if (query.where) {
              query.where.createdBy = req.user.id
            } else {
              query.where = {}
              query.where.createdBy = req.user.id
            }
          }

          query = queryParser(query)

          // const content = req.params.content

          var count = await model.countDocuments(query).exec()
          const paginatorInstance = new Paginator(page, perPage, count)

          var cntnts = await model
            .find(query)
            .sort({ [sortBy]: sortOrder })
            .skip(paginatorInstance.offset())
            .limit(paginatorInstance.perPage)
            .exec()

          return { contents: cntnts, paginatorInstance }
        } catch (error) {
          console.log(error)
          throw new Error(error)
        }
      },

      async isValid (req, values) {
        const schema = await Schema.getSchemaByContent(req.params.content)

        var allCustomFields = await Field.getAllFields(req)

        const validation = ContentValidator.validateFields(
          schema.fields,
          values,
          allCustomFields
        )

        return validation
      },

      async patchById (req) {
        try {
          var id = req.params.id
          if (!ObjectID.isValid(id)) {
            return null
          }

          const data = flow(
            omitBy(isUndefined)
          )(req.body)

          const validation = await this.isValid(req, data)

          if (validation) {
            throw validation
          }

          if (req.user) {
            data.updatedBy = req.user.id
          }

          data.updatedAt = new Date()

          const model = this

          var query = { _id: id }

          // if (req.owner) {
          //   query.createdBy = req.user.id
          // }

          const tmp = await model.findOneAndUpdate(
            query,
            { $set: data },
            { new: true, runValidators: true }
          )

          return tmp
        } catch (error) {
          if (!Joi.isError(error)) {
            console.log(error)
          }
          throw error
        }
      },

      async postContent (req) {
        try {
          var Model = this

          const data = flow(
            omitBy(isUndefined)
          )(req.body)

          const validation = await this.isValid(req, data)

          if (validation) {
            throw validation
          }

          data.status = 'publish'
          data.trash = false

          if (req.user) {
            data.createdBy = req.user.id
            data.updatedBy = req.user.id
          }

          data.createdAt = new Date()
          data.updatedAt = new Date()

          var cntnt = new Model(data)

          let c = await cntnt.save()

          c = c.toObject()

          aventum.hooks.doActionSync(`${c}ContentCreated`, c, req)

          // Delete the cache of the GET /contents, GET /contents/all
          aventum.cache.batchDeletionKeysByPattern(`contents:${c}:p:*`)

          return c
        } catch (error) {
          if (!Joi.isError(error)) {
            console.log(error)
          }
          throw error
        }
      },

      async getAllContents (req) {
        try {
          var {
            getMongoDBSortByStyle,
            queryParser,
            getMongoDBSortOrderStyle
          } = require('../../helpers')

          const model = this

          var query = req.query.query ? JSON.parse(req.query.query) : {}
          var sortBy = query.sortBy
            ? getMongoDBSortByStyle(query.sortBy)
            : '_id'
          var sortOrder = query.sortOrder
            ? getMongoDBSortOrderStyle(query.sortOrder)
            : -1

          if (req.returnedDataRestriction === 'ownedData') {
            if (query.where) {
              query.where.createdBy = req.user.id
            } else {
              query.where = {}
              query.where.createdBy = req.user.id
            }
          }

          query = queryParser(query)

          var contents = await model
            .find(query)
            .sort({ [sortBy]: sortOrder })
            .exec()

          return contents
        } catch (error) {
          console.log(error)
          return null
        }
      },

      async getById (req) {
        try {
          var model = this

          var id = req.params.id

          if (!ObjectID.isValid(id)) {
            return null
          }

          var query = {
            _id: id
          }

          if (req.returnedDataRestriction === 'ownedData') {
            query.createdBy = req.user.id
          }

          var cntnt = await model
            .findOne(query)
            .exec()

          return cntnt
        } catch (error) {
          console.log(error)
          return null
        }
      },

      async deleteById (req) {
        try {
          const model = this

          var id = req.params.id

          if (!ObjectID.isValid(id)) {
            return null
          }

          var query = {
            _id: id
          }

          // if (req.owner) {
          //   query.createdBy = req.user.id
          // }

          const tmp = await model.findOneAndRemove(query)

          return tmp
        } catch (error) {
          console.log(error)
          return null
        }
      }
    }
  }
}

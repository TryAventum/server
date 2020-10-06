var mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
var Schema = require(process.env.DB_TYPE === 'mongodb'
  ? './models/mongodb/schema'
  : './models/sql/schema')
var Capability = require(process.env.DB_TYPE === 'mongodb'
  ? './models/mongodb/capability'
  : './models/sql/capability')
var Option = require(process.env.DB_TYPE === 'mongodb'
  ? './models/mongodb/option'
  : './models/sql/option')
const { UploadsHelper } = require('./packages/uploads-helper/index')
var { arrayUnique } = require('./std-helpers')
if (process.env.DB_TYPE !== 'mongodb') {
  var { sqlContentModal } = require('./models/sql/content')
} else {
  var { getValidSchema, getMongooseSchemaMethods } = require('./models/mongodb/content')
}

async function siblingsFeaturedImageHelper (product) {
  if (product.siblings.length) {
    product.siblings = product.siblings.map(async p => {
      p.featured = await UploadsHelper.setPublicURL(p.featured)
      return p
    })

    product.siblings = await Promise.all(product.siblings)
  }
  return product
}

// function getPureModel(table) {
//   return class extends Model {
//     constructor(values = null) {
//       super(table)
//       this.values = values
//     }
//   }
// }

async function passwordHasher (password) {
  try {
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)

    return hash
  } catch (error) {
    throw new Error(error)
  }
}

async function getModal (content) {
  try {
    if (process.env.DB_TYPE === 'mongodb') {
      const schema = await getValidSchema(content)

      var contentSchema = new mongoose.Schema(schema.schema, schema.virtuals)
      const schemaFunctions = getMongooseSchemaMethods()

      // Add the statics functions
      for (const fn in schemaFunctions.statics) {
        if (Object.prototype.hasOwnProperty.call(schemaFunctions.statics, fn)) {
          const element = schemaFunctions.statics[fn]
          contentSchema.statics[fn] = element
        }
      }

      // Add instance methods
      if (schemaFunctions.methods) {
        for (const fn in schemaFunctions.methods) {
          if (Object.prototype.hasOwnProperty.call(schemaFunctions.methods, fn)) {
            const element = schemaFunctions.methods[fn]
            contentSchema.methods[fn] = element
          }
        }
      }

      // contentSchema.statics

      /**
       * https://stackoverflow.com/a/53329374/3263601
       *
       * Without this we will receive OverwriteModelError: Cannot overwrite `content` model once compiled.
       */
      let model
      try {
        model = mongoose.model(content)
      } catch (e) {
        model = mongoose.model(content, contentSchema)
      }

      return { model, schema }
    } else {
      content = await Schema.getSchemaByContent(content)

      const schema = {
        schemaDetails: {
          ...content
        }
      }

      const model = sqlContentModal(content.name)

      return { model, schema }
    }
  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

async function getOption (optionName = null) {
  if (!optionName) {
    return null
  }
  const option = await Option.getOption(optionName)

  return option
}

async function getOptionValue (optionName = null) {
  if (!optionName) {
    return null
  }
  const option = await Option.getOption(optionName)

  return option.value
}

function getMongoDBSortOrderStyle (option) {
  if (option === 'DESC') {
    return -1
  } else {
    return 1
  }
}

function getMongoDBSortByStyle (field) {
  if (field === 'id') {
    return '_id'
  } else {
    return field
  }
}

function queryParser (options) {
  if (process.env.DB_TYPE === 'mongodb') {
    let newQuery = {}

    for (const key in options) {
      if (Object.prototype.hasOwnProperty.call(options, key)) {
        const element = options[key]

        switch (key) {
          case 'where':
            if (Array.isArray(element)) {
              for (const ele of element) {
                newQuery = { ...newQuery, ...ele }
              }
            } else {
              newQuery = { ...newQuery, ...element }
            }

            if (newQuery.id) {
              newQuery._id = newQuery.id
              delete newQuery.id
            }
            break

          case 'whereIn':
            if (Array.isArray(element)) {
              for (const ele of element) {
                if (ele.column === 'id') {
                  ele.column = '_id'
                }
                newQuery[ele.column] = { $in: ele.values }
              }
            } else {
              if (element.column === 'id') {
                element.column = '_id'
              }
              newQuery[element.column] = { $in: element.values }
            }
            break

          case 'whereNot':
            if (Array.isArray(element)) {
              for (const ele of element) {
                if (ele.column === 'id') {
                  ele.column = '_id'
                }
                newQuery[ele.column] = { $ne: ele.values }
              }
            } else {
              if (element.column === 'id') {
                element.column = '_id'
              }
              newQuery[element.column] = { $ne: element.values }
            }
            break

          case 'whereNotIn':
            if (Array.isArray(element)) {
              for (const ele of element) {
                if (ele.column === 'id') {
                  ele.column = '_id'
                }
                newQuery[ele.column] = { $nin: ele.values }
              }
            } else {
              if (element.column === 'id') {
                element.column = '_id'
              }
              newQuery[element.column] = { $nin: element.values }
            }
            break

          case 'whereEqual':
            if (Array.isArray(element)) {
              for (const ele of element) {
                if (ele.column === 'id') {
                  ele.column = '_id'
                }
                newQuery[ele.column] = { $eq: ele.values }
              }
            } else {
              if (element.column === 'id') {
                element.column = '_id'
              }
              newQuery[element.column] = { $eq: element.values }
            }
            break

          case 'like':
            if (Array.isArray(element)) {
              for (const ele of element) {
                if (ele.column === 'id') {
                  ele.column = '_id'
                }
                newQuery[ele.column] = {
                  $regex: '.*' + ele.value + '.*',
                  $options: 'i'
                }
              }
            } else {
              if (element.column === 'id') {
                element.column = '_id'
              }
              newQuery[element.column] = {
                $regex: '.*' + element.value + '.*',
                $options: 'i'
              }
            }
            break

          case 'notLike':
            if (Array.isArray(element)) {
              for (const ele of element) {
                if (ele.column === 'id') {
                  ele.column = '_id'
                }
                newQuery[ele.column] = {
                  $not: {
                    $regex: '.*' + ele.value + '.*',
                    $options: 'i'
                  }
                }
              }
            } else {
              if (element.column === 'id') {
                element.column = '_id'
              }
              newQuery[element.column] = {
                $not: {
                  $regex: '.*' + element.value + '.*',
                  $options: 'i'
                }
              }
            }
            break
        }
      }
    }

    return newQuery
  } else {
    return options
  }
}

async function setupCapabilitiesTable (rolesCapabilities) {
  let allCapabilities = []

  for (const role in rolesCapabilities) {
    allCapabilities = [...allCapabilities, ...rolesCapabilities[role]]
  }

  const transformedCapabilities = arrayUnique(allCapabilities).map(c => {
    return {
      name: c,
      label: c
    }
  })

  // setup the capabilities table and get all the capabilities
  const capabilitiesDocuments = await Capability.insertMany(
    transformedCapabilities
  )

  return capabilitiesDocuments
}

module.exports = {
  siblingsFeaturedImageHelper,
  setupCapabilitiesTable,
  getModal,
  getOption,
  getOptionValue,
  passwordHasher,
  getMongoDBSortOrderStyle,
  getMongoDBSortByStyle,
  queryParser
}

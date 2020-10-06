const Joi = require('@hapi/joi')
var isUndefined = require('lodash/fp/isUndefined')
var omitBy = require('lodash/fp/omitBy')
var flow = require('lodash/fp/flow')
var Model = require('./lib/Model')
var Schema = require('./schema')
var { Paginator } = require('../../packages/paginator/index')
var Field = require('./field')
var ContentValidator = require('../../packages/content-validator')

module.exports.sqlContentModal = function (content) {
  return class extends Model {
    constructor (values = null) {
      super(content)
      this.modelConfig.values = values
    }

    static async deleteRelationalData (id) {
      try {
        const model = new this()

        const schema = await Schema.getSchemaByContent(model.modelConfig.table)

        const allPromises = []

        for (const field of schema.fields) {
          switch (field.type) {
            case 'relation':
            case 'upload':
            { let rfn

              if (field.type === 'upload') {
                rfn = 'uploads'
              } else {
                var allSchemas = await Schema.getAllSchemas()
                rfn = allSchemas.find(s => s.id === field.reference).name
              }

              allPromises.push(
                aventum
                  .knex(`${schema.name}-${rfn}-${field.name}`)
                  .where({ [`${schema.name}Id`]: id })
                  .del()
              )

              break }

            case 'select':
              allPromises.push(
                aventum
                  .knex(`${schema.name}-${field.name}`)
                  .where({ [`${schema.name}Id`]: id })
                  .del()
              )
              break

            default:
              if (field.repeatable && field.type !== 'custom') {
                allPromises.push(
                  aventum
                    .knex(`${schema.name}-${field.name}`)
                    .where({ [`${schema.name}Id`]: id })
                    .del()
                )
              }
              break
          }
        }

        await Promise.all(allPromises)
      } catch (error) {
        console.log(error)
        throw new Error(error)
      }
    }

    static async setRelationalData (contents) {
      try {
        contents = contents.filter(c => typeof c === 'object')

        if (!contents.length) {
          return []
        }

        const model = new this()

        const schema = await Schema.getSchemaByContent(model.modelConfig.table)

        contents = await Promise.all(
          contents.map(async content => {
            for (const field of schema.fields) {
              switch (field.type) {
                case 'relation':
                case 'upload':
                { let rfn

                  if (field.type === 'upload') {
                    rfn = 'uploads'
                  } else {
                    var allSchemas = await Schema.getAllSchemas()
                    rfn = allSchemas.find(s => s.id === field.reference).name
                  }

                  // We have content that have relation with itself like categories have child/children categories
                  const secondColumn = rfn === schema.name ? `child${rfn.capitalize()}Id` : `${rfn}Id`

                  const relationalObjects = await aventum
                    .knex(`${schema.name}-${rfn}-${field.name}`)
                    .where({ [`${schema.name}Id`]: content.id })
                    .orderBy('order', 'ASC')

                  const tmp = relationalObjects.map(o => Number(o[secondColumn]))

                  if (field.repeatable) {
                    content[field.name] = tmp
                  } else {
                    if (tmp.length) {
                      content[field.name] = tmp[0]
                    } else {
                      content[field.name] = null
                    }
                  }
                  break }

                case 'select':
                { const tableName = `${schema.name}-${field.name}-options`

                  const [allOptions, fieldSelectedOptions] = await Promise.all([
                    aventum.knex(tableName).orderBy('order', 'ASC'),
                    aventum
                      .knex(`${schema.name}-${field.name}`)
                      .where({ [`${schema.name}Id`]: content.id })
                      .orderBy('order', 'ASC')
                  ])

                  var fieldSelectedOptionsIds = fieldSelectedOptions.map(
                    o => o[`${tableName}Id`]
                  )

                  const tmp1 = allOptions
                    .filter(o => fieldSelectedOptionsIds.includes(o.id))
                    .map(o => o.value)

                  if (field.repeatable) {
                    content[field.name] = tmp1
                  } else {
                    if (tmp1.length) {
                      content[field.name] = tmp1[0]
                    } else {
                      content[field.name] = ''
                    }
                  }
                  break }

                default:
                  if (field.repeatable && field.type !== 'custom') {
                    const relationalObjects = await aventum
                      .knex(`${schema.name}-${field.name}`)
                      .where({ [`${schema.name}Id`]: content.id })
                      .orderBy('order', 'ASC')

                    content[field.name] = relationalObjects.map(o => o.value)
                  } else if (field.type === 'custom') {
                    content[field.name] = JSON.parse(content[field.name])
                  }
                  break
              }
            }

            return content
          })
        )

        return contents
      } catch (error) {
        console.log(error)
        throw new Error(error)
      }
    }

    // static async oldGetContents(req) {
    //   try {
    //     var model = this

    //     let page = +req.query.page
    //     var query = req.query.query ? JSON.parse(req.query.query) : {}

    //     var count = await model.count(query)
    //     let paginatorInstance = new Paginator(page, 20, count)

    //     var contents = await model.find({
    //       ...query,
    //       offset: paginatorInstance.offset(),
    //       limit: paginatorInstance.perPage
    //     })

    //     contents = await this.setRelationalData(contents)

    //     return { contents, paginatorInstance }
    //   } catch (error) {
    //     console.log(error)
    //     throw new Error(error)
    //   }
    // }

    getTableData (schema, column, allSchemas, alreadyJoined, knexObj) {
      const field = schema.fields.find(f => f.name === column)
      let joinTables = null
      let whereData = null
      const whereFprDefaultNormalField = {
        table: schema.name,
        column
      }

      // Because there are some fields like createdBy, updatedBy not exist in schema.fields
      if (field) {
        switch (field.type) {
          case 'relation':
          case 'upload':
          { let rfn

            if (field.type === 'upload') {
              rfn = 'uploads'
            } else {
              rfn = allSchemas.find(s => s.id === field.reference).name
            }

            // We have content that have relation with itself like categories have child/children categories
            const secondColumn = rfn === schema.name ? `child${rfn.capitalize()}Id` : `${rfn}Id`

            // The following will be translated to:
            // inner join `${schema.name}-${rfn}-${field.name}` on `${schema.name}Id` = `${schema.name}.id`
            // inner join `${rfn}` on `${rfn}.id` = `${schema.name}-${rfn}-${field.name}.${secondColumn}`
            joinTables = [
              [
                `${schema.name}-${rfn}-${field.name}`,
                `${schema.name}-${rfn}-${field.name}.${schema.name}Id`,
                `${schema.name}.id`
              ],
              [
                `${rfn}`,
                `${rfn}.id`,
                `${schema.name}-${rfn}-${field.name}.${secondColumn}`
              ]
            ]

            whereData = {
              table: `${schema.name}-${rfn}-${field.name}`,
              column: `${secondColumn}`
            }
            break }
          case 'select':
          {
            joinTables = [
              [
                `${schema.name}-${field.name}`,
                `${schema.name}-${field.name}.${schema.name}Id`,
                `${schema.name}.id`
              ],
              [
                `${schema.name}-${field.name}-options`,
                `${schema.name}-${field.name}-options.id`,
                `${schema.name}-${field.name}.${schema.name}-${field.name}-optionsId`
              ]
            ]

            whereData = {
              table: `${schema.name}-${field.name}-options`,
              column: 'value'
            }
            break }
          default:
            if (field.repeatable && field.type !== 'custom') {
              joinTables = [
                [
                  `${schema.name}-${field.name}`,
                  `${schema.name}-${field.name}.${schema.name}Id`,
                  `${schema.name}.id`
                ]
              ]

              whereData = {
                table: `${schema.name}-${field.name}`,
                column: 'value'
              }
              break
            } else {
              whereData = whereFprDefaultNormalField
              break
            }
        }
      } else {
        whereData = whereFprDefaultNormalField
      }

      if (joinTables && joinTables.length) {
        for (const table of joinTables) {
          const tmp = table.join()
          if (!alreadyJoined.includes(tmp)) {
            alreadyJoined.push(tmp)
            knexObj.innerJoin(table[0], table[1], table[2])
          }
        }
      }

      return whereData
    }

    static async countContent (schema, allSchemas, query) {
      const mod = new this()

      let count = await mod.contentQueryBuilder(schema, allSchemas, query, true)

      count = count.length ? Number(count[0].count) : 0

      return count
    }

    contentQueryBuilder (schema, allSchemas, options, count = false) {
      let knexObj = aventum.knex
        .select(`${this.modelConfig.table}.${count ? 'id' : '*'}`)
        .from(this.modelConfig.table)
        .distinct()
      const alreadyJoined = []
      const sort = {}

      for (const key in options) {
        if (Object.prototype.hasOwnProperty.call(options, key)) {
          const element = options[key]

          switch (key) {
            default:
            case 'where':
              if (Array.isArray(element)) {
                if (element.length) {
                  for (const ele of element) {
                    // We check each columns in the where query in case if some columns belongs to different
                    // tables
                    for (const k in ele) {
                      // k should be column name
                      if (Object.prototype.hasOwnProperty.call(ele, k)) {
                        const tableDetail = this.getTableData(
                          schema,
                          k,
                          allSchemas,
                          alreadyJoined,
                          knexObj
                        )

                        knexObj.where(
                          `${tableDetail.table}.${tableDetail.column}`,
                          '=',
                          ele[k]
                        )
                      }
                    }
                  }
                }
              } else {
                for (const k in element) {
                  // k should be column name
                  if (Object.prototype.hasOwnProperty.call(element, k)) {
                    const tableDetail = this.getTableData(
                      schema,
                      k,
                      allSchemas,
                      alreadyJoined,
                      knexObj
                    )

                    knexObj.where(
                      `${tableDetail.table}.${tableDetail.column}`,
                      '=',
                      element[k]
                    )
                  }
                }
              }
              break

            case 'whereIn':
              if (Array.isArray(element)) {
                if (element.length) {
                  for (const ele of element) {
                    const tableDetail = this.getTableData(
                      schema,
                      ele.column,
                      allSchemas,
                      alreadyJoined,
                      knexObj
                    )

                    knexObj.whereIn(
                      `${tableDetail.table}.${tableDetail.column}`,
                      ele.values
                    )
                  }
                }
              } else {
                const tableDetail = this.getTableData(
                  schema,
                  element.column,
                  allSchemas,
                  alreadyJoined,
                  knexObj
                )

                knexObj.whereIn(
                  `${tableDetail.table}.${tableDetail.column}`,
                  element.values
                )
              }
              break

            case 'whereNotIn':
              if (Array.isArray(element)) {
                if (element.length) {
                  for (const ele of element) {
                    const tableDetail = this.getTableData(
                      schema,
                      ele.column,
                      allSchemas,
                      alreadyJoined,
                      knexObj
                    )

                    knexObj.whereNotIn(
                      `${tableDetail.table}.${tableDetail.column}`,
                      ele.values
                    )
                  }
                }
              } else {
                const tableDetail = this.getTableData(
                  schema,
                  element.column,
                  allSchemas,
                  alreadyJoined,
                  knexObj
                )

                knexObj.whereNotIn(
                  `${tableDetail.table}.${tableDetail.column}`,
                  element.values
                )
              }
              break

            case 'orWhereNotIn':
              if (Array.isArray(element)) {
                if (element.length) {
                  for (const ele of element) {
                    const tableDetail = this.getTableData(
                      schema,
                      ele.column,
                      allSchemas,
                      alreadyJoined,
                      knexObj
                    )

                    knexObj.orWhereNotIn(
                      `${tableDetail.table}.${tableDetail.column}`,
                      ele.values
                    )
                  }
                }
              } else {
                const tableDetail = this.getTableData(
                  schema,
                  element.column,
                  allSchemas,
                  alreadyJoined,
                  knexObj
                )

                knexObj.orWhereNotIn(
                  `${tableDetail.table}.${tableDetail.column}`,
                  element.values
                )
              }
              break

            case 'whereNot':
              if (Array.isArray(element)) {
                if (element.length) {
                  for (const ele of element) {
                    const tableDetail = this.getTableData(
                      schema,
                      ele.column,
                      allSchemas,
                      alreadyJoined,
                      knexObj
                    )

                    knexObj.whereNot(
                          `${tableDetail.table}.${tableDetail.column}`,
                          '=',
                          ele.values
                    )
                  }
                }
              } else {
                const tableDetail = this.getTableData(
                  schema,
                  element.column,
                  allSchemas,
                  alreadyJoined,
                  knexObj
                )

                knexObj.whereNot(
                      `${tableDetail.table}.${tableDetail.column}`,
                      '=',
                      element.values
                )
              }
              break

            case 'orWhereIn':
              if (Array.isArray(element)) {
                if (element.length) {
                  for (const ele of element) {
                    const tableDetail = this.getTableData(
                      schema,
                      ele.column,
                      allSchemas,
                      alreadyJoined,
                      knexObj
                    )

                    knexObj.orWhereIn(
                      `${tableDetail.table}.${tableDetail.column}`,
                      ele.values
                    )
                  }
                }
              } else {
                const tableDetail = this.getTableData(
                  schema,
                  element.column,
                  allSchemas,
                  alreadyJoined,
                  knexObj
                )

                knexObj.orWhereIn(
                  `${tableDetail.table}.${tableDetail.column}`,
                  element.values
                )
              }
              break

            case 'like':
              if (Array.isArray(element)) {
                if (element.length) {
                  for (const ele of element) {
                    const tableDetail = this.getTableData(
                      schema,
                      ele.column,
                      allSchemas,
                      alreadyJoined,
                      knexObj
                    )

                    knexObj.where(
                      `${tableDetail.table}.${tableDetail.column}`,
                      'like',
                      `%${ele.value}%`
                    )
                  }
                }
              } else {
                const tableDetail = this.getTableData(
                  schema,
                  element.column,
                  allSchemas,
                  alreadyJoined,
                  knexObj
                )

                knexObj.where(
                  `${tableDetail.table}.${tableDetail.column}`,
                  'like',
                  `%${element.value}%`
                )
              }
              break

            case 'notLike':
              if (Array.isArray(element)) {
                if (element.length) {
                  for (const ele of element) {
                    const tableDetail = this.getTableData(
                      schema,
                      ele.column,
                      allSchemas,
                      alreadyJoined,
                      knexObj
                    )

                    knexObj.whereNot(
                      `${tableDetail.table}.${tableDetail.column}`,
                      'like',
                      `%${ele.value}%`
                    )
                  }
                }
              } else {
                const tableDetail = this.getTableData(
                  schema,
                  element.column,
                  allSchemas,
                  alreadyJoined,
                  knexObj
                )

                knexObj.whereNot(
                  `${tableDetail.table}.${tableDetail.column}`,
                  'like',
                  `%${element.value}%`
                )
              }
              break

            case 'offset':
              knexObj.offset(element)
              break

            case 'limit':
              knexObj.limit(element)
              break

            case 'sortBy':
            case 'sortOrder':
              sort[key] = element
              break
          }
        }
      }

      if (!count) {
        if (Object.prototype.hasOwnProperty.call(sort, 'sortOrder')) {
          let tableDetail
          if (sort.sortBy === 'id') {
            tableDetail = {
              table: schema.name,
              column: 'id'
            }
          } else {
            tableDetail = this.getTableData(
              schema,
              sort.sortBy,
              allSchemas,
              alreadyJoined,
              knexObj
            )
          }

          knexObj.orderBy(
            `${tableDetail.table}.${tableDetail.column}`,
            sort.sortOrder
          )
        }
      } else {
        knexObj = aventum.knex
          .select(aventum.knex.raw('count(*) over()'))
          .from(this.modelConfig.table)
          .where(`${this.modelConfig.table}.id`, 'in', knexObj)
      }

      return knexObj
    }

    static async findContent (schema, allSchemas, options) {
      const mod = new this()

      options.where = options.where || {}
      options.sortBy = options.sortBy || 'id'
      options.sortOrder = options.sortOrder || 'DESC'

      var rows = await mod.contentQueryBuilder(schema, allSchemas, options)

      return this.castRowsToThis(rows)
    }

    static async getContents (req) {
      try {
        var model = this

        const instance = new this()
        const schema = await Schema.getSchemaByContent(instance.modelConfig.table)
        var allSchemas = await Schema.getAllSchemas()

        const page = +req.query.page || 1
        const perPage = +req.query.perPage || 20
        var query = req.query.query ? JSON.parse(req.query.query) : {}

        if (req.returnedDataRestriction === 'ownedData') {
          if (query.where) {
            query.where.createdBy = req.user.id
          } else {
            query.where = {}
            query.where.createdBy = req.user.id
          }
        }

        var count = await model.countContent(schema, allSchemas, query)
        const paginatorInstance = new Paginator(page, perPage, count)

        var contents = await model.findContent(schema, allSchemas, {
          ...query,
          offset: paginatorInstance.offset(),
          limit: paginatorInstance.perPage
        })

        contents = await this.setRelationalData(contents)

        return { contents, paginatorInstance }
      } catch (error) {
        console.log(error)
        throw new Error(error)
      }
    }

    /**
     * Insert the data into the relational tables and return the filtered
     * data that can insert directly into the schema table.
     *
     * This function can be used for create and update data because it will
     * check for req.params.id if it found it then it will update.
     */
    static async saveData (req, schema) {
      try {
        const fields = flow(omitBy(isUndefined))(req.body)

        var allCustomFields = await Field.getAllFields(req)

        const validation = ContentValidator.validateFields(
          schema.fields,
          fields,
          allCustomFields
        )

        if (validation) {
          throw validation
        }

        const selectFields = []
        const relationUploadFields = []
        const repeatableFields = []
        const customFields = []
        const normalFields = []

        for (const fieldName in fields) {
          if (Object.prototype.hasOwnProperty.call(fields, fieldName)) {
            if (fieldName === 'id') {
              continue
            }
            const value = fields[fieldName]
            const fieldObject = schema.fields.find(f => f.name === fieldName)

            if (fieldObject) {
              switch (fieldObject.type) {
                case 'relation':
                case 'upload':
                  relationUploadFields.push({
                    name: fieldName,
                    fieldObject,
                    value
                  })
                  break

                case 'select':
                  selectFields.push({ name: fieldName, fieldObject, value })
                  break

                case 'custom':
                  customFields.push({ name: fieldName, fieldObject, value })
                  break

                default:
                  if (fieldObject.repeatable) {
                    repeatableFields.push({
                      name: fieldName,
                      fieldObject,
                      value
                    })
                  } else {
                    normalFields.push({ name: fieldName, fieldObject, value })
                  }
                  break
              }
            }
          }
        }

        let contentValues = normalFields.reduce(
          (accumulator, currentValue) => ({
            ...accumulator,
            [currentValue.name]: currentValue.value
          }),
          {}
        )

        const handleCustomFields = customFields.reduce(
          (accumulator, currentValue) => ({
            ...accumulator,
            [currentValue.name]: JSON.stringify(currentValue.value)
          }),
          {}
        )

        // We save the custom fields in the same table
        contentValues = {
          ...contentValues,
          ...handleCustomFields
        }

        if (req.user && !req.params.id) {
          contentValues.createdBy = req.user.id
        } else if (req.user && req.params.id) {
          contentValues.updatedBy = req.user.id
        }

        if (req.params.id) {
          contentValues.updatedAt = aventum.knex.fn.now(6)
        }

        var insertedContent
        if (!req.params.id) {
          insertedContent = await this.create(contentValues)
        } else {
          var query = { id: req.params.id }

          // if (req.owner) {
          //   query.createdBy = req.user.id
          // }

          if (Object.keys(contentValues).length) {
            insertedContent = await this.updateOne({
              where: query,
              values: contentValues
            })
          } else {
            insertedContent = await this.findRow(query)
          }
        }

        if (!insertedContent) {
          return null
        }

        if (selectFields.length) {
          for (const field of selectFields) {
            // Options table
            const tableName = `${schema.name}-${field.name}-options`

            var allOptions = await aventum.knex(tableName)

            var fieldIds = []
            if (field.fieldObject.repeatable) {
              fieldIds = field.value.map(p => {
                return allOptions.find(u => u.value === p).id
              })
            } else {
              fieldIds = [allOptions.find(u => u.value === field.value).id]
            }

            await this.setWithOrder({
              id: insertedContent.id,
              values: fieldIds,
              sourceFieldName: `${schema.name}Id`,
              targetFieldName: `${tableName}Id`,
              table: `${schema.name}-${field.name}`
            })
          }
        }

        if (relationUploadFields.length) {
          for (const field of relationUploadFields) {
            let rfn

            if (field.fieldObject.type === 'upload') {
              rfn = 'uploads'
            } else {
              var allSchemas = await Schema.getAllSchemas()
              rfn = allSchemas.find(s => s.id === field.fieldObject.reference)
                .name
            }

            // We have content that have relation with itself like categories have child/children categories
            const secondColumn = rfn === schema.name ? `child${rfn.capitalize()}Id` : `${rfn}Id`

            if (field.fieldObject.repeatable) {
              fieldIds = field.value
            } else {
              fieldIds = [field.value]
            }

            await this.setWithOrder({
              id: insertedContent.id,
              values: fieldIds,
              sourceFieldName: `${schema.name}Id`,
              targetFieldName: secondColumn,
              table: `${schema.name}-${rfn}-${field.name}`
            })
          }
        }

        if (repeatableFields.length) {
          for (const field of repeatableFields) {
            await this.setWithOrder({
              id: insertedContent.id,
              values: field.value,
              sourceFieldName: `${schema.name}Id`,
              targetFieldName: 'value',
              table: `${schema.name}-${field.name}`,
              targetFieldNaN: true
            })
          }
        }

        insertedContent = await this.setRelationalData([insertedContent])

        return insertedContent[0]
      } catch (error) {
        if (!Joi.isError(error)) {
          console.log(error)
        }
        throw error
      }
    }

    static async postContent (req, res) {
      try {
        const schema = await Schema.getSchemaByContent(req.params.content)

        const data = await this.saveData(req, schema)

        if (!data) {
          return null
        }

        aventum.hooks.doActionSync(`${content}ContentCreated`, data, req, res)

        // Delete the cache of the GET /contents, GET /contents/all
        aventum.cache.batchDeletionKeysByPattern(`contents:${content}:p:*`)

        return data
      } catch (error) {
        if (!Joi.isError(error)) {
          console.log(error)
        }
        throw error
      }
    }

    static async getAllContents (req) {
      try {
        var model = this

        var query = req.query.query ? JSON.parse(req.query.query) : {}

        if (req.returnedDataRestriction === 'ownedData') {
          if (query.where) {
            query.where.createdBy = req.user.id
          } else {
            query.where = {}
            query.where.createdBy = req.user.id
          }
        }

        var contents = await model.find(query)

        contents = await this.setRelationalData(contents)

        return contents
      } catch (error) {
        console.log(error)
        throw new Error(error)
      }
    }

    static async patchById (req) {
      try {
        const schema = await Schema.getSchemaByContent(req.params.content)

        const data = await this.saveData(req, schema)

        if (!data) {
          return null
        }

        return data
      } catch (error) {
        if (!Joi.isError(error)) {
          console.log(error)
        }
        throw error
      }
    }

    static async getById (req) {
      try {
        var model = this

        var id = req.params.id

        if (!id) {
          return null
        }

        var query = { id }

        if (req.returnedDataRestriction === 'ownedData') {
          query.createdBy = req.user.id
        }

        var content = await model.findRow(query)

        content = await this.setRelationalData([content])

        return content[0]
      } catch (error) {
        console.log(error)
        throw new Error(error)
      }
    }

    static async deleteById (req) {
      const model = this
      var id = req.params.id

      if (!id) {
        return null
      }

      try {
        var query = { id }

        // if (req.owner) {
        //   query.createdBy = req.user.id
        // }

        // We don't have to delete the relational data because we set onDelete to CASCADE
        const tmp = await model.del(query)

        if (tmp) {
          await this.deleteRelationalData(id)
        }

        return tmp
      } catch (error) {
        console.log(error)
        throw new Error(error)
      }
    }
  }
}

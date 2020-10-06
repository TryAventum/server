/* eslint-disable eqeqeq */
const Model = require('./lib/Model')

const { Paginator } = require('../../packages/paginator/index')
var { getStringID } = require('../../std-helpers')

class Schema extends Model {
  constructor (values = null) {
    super('schemas')
    this.modelConfig.values = values
  }

  static async createTableIfNotExist (tableName, fields) {
    try {
      const exists = await aventum.knex.schema.hasTable(tableName)
      if (!exists) {
        await aventum.knex.schema.createTable(tableName, table => {
          table
            .bigIncrements('id', 20)
            .primary()
            .unsigned()

          for (const field of fields) {
            this.setColumn(table, field)
          }
        })
      }
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static setColumn (table, field) {
    const fieldType = field.type

    if (
      (field.repeatable && fieldType !== 'custom') ||
      fieldType === 'select' || fieldType === 'relation' || fieldType === 'upload'
    ) {
      return
    }

    let foreignKey = null

    switch (fieldType) {
      case 'integer':
        if (field.unsigned) {
          table.integer(field.name).unsigned()
        } else {
          table.integer(field.name)
        }
        break

      case 'bigInteger':
        if (field.unsigned) {
          table.bigInteger(field.name).unsigned()
        } else {
          table.bigInteger(field.name)
        }
        break

      case 'dateTime':
        table.datetime(field.name)
        break

      case 'time':
        table.time(field.name)
        break

      case 'date':
        table.date(field.name)
        break

      case 'custom':
      case 'textarea':
        table.text(field.name)
        break

      case 'decimal':
        table.decimal(field.name)
        break

      case 'boolean':
      case 'checkbox':
        table.boolean(field.name)
        break

      case 'upload':
        table.bigInteger(field.name).unsigned()
        foreignKey = { name: field.name, reference: 'uploads' }
        break

      case 'relation':
        table.bigInteger(field.name).unsigned()
        foreignKey = { name: field.name, reference: `${field.reference}` }
        break

      default:
        if (field.unique) {
          table.string(field.name, 1000).unique()
        } else {
          table.string(field.name, 1000)
        }
        break
    }

    if (!foreignKey && field.reference) {
      foreignKey = { name: field.name, reference: field.reference }
    }

    if (foreignKey) {
      table
        .foreign(foreignKey.name)
        .references(`${foreignKey.reference}.id`)
        .onUpdate('CASCADE')
        .onDelete('CASCADE')
    }
  }

  static async createNormalRepeatableFieldRelationalTable (field, newSchema) {
    try {
      await this.createTableIfNotExist(`${newSchema.name}-${field.name}`, [
        {
          name: `${newSchema.name}Id`,
          type: 'bigInteger',
          unsigned: true,
          reference: `${newSchema.name}`
        },
        { name: 'value', type: field.type },
        { name: 'order', type: 'integer', unsigned: true }
      ])
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async createUploadOrRelationRelationalTable (
    field,
    fieldType,
    newSchema
  ) {
    try {
      let rfn

      if (fieldType === 'upload') {
        rfn = 'uploads'
      } else {
        var allSchemas = await this.getAllSchemas()
        rfn = allSchemas.find(s => s.id == field.reference).name
      }

      // We have content that have relation with itself like categories have child/children categories
      const secondColumn = rfn === newSchema.name ? `child${rfn.capitalize()}Id` : `${rfn}Id`

      await this.createTableIfNotExist(
        `${newSchema.name}-${rfn}-${field.name}`,
        [
          {
            name: `${newSchema.name}Id`,
            type: 'bigInteger',
            unsigned: true,
            reference: `${newSchema.name}`
          },
          {
            name: secondColumn,
            type: 'bigInteger',
            unsigned: true,
            reference: `${rfn}`
          },
          {
            name: 'order',
            type: 'integer',
            unsigned: true
          }
        ]
      )
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async createOptionTable (field, newSchema) {
    try {
      var { arrayUniqueByProperty } = require('../../std-helpers')
      const tableName = `${newSchema.name}-${field.name}-options`
      // Create a table for these options
      await this.createTableIfNotExist(tableName, [
        { name: 'value', type: 'string', unique: true },
        { name: 'label', type: 'string' },
        { name: 'order', type: 'integer', unsigned: true }
      ])

      // Insert the select field options as values in the table above
      await aventum.knex(tableName).insert(
        arrayUniqueByProperty(field.options, 'value').map(o => ({
          value: o.value,
          label: o.label
        }))
      )

      // We have many-to-many relationship with this newly created table
      await this.createTableIfNotExist(`${newSchema.name}-${field.name}`, [
        {
          name: `${newSchema.name}Id`,
          type: 'bigInteger',
          unsigned: true,
          reference: `${newSchema.name}`
        },
        {
          name: `${tableName}Id`,
          type: 'bigInteger',
          unsigned: true,
          reference: `${tableName}`
        },
        {
          name: 'order',
          type: 'integer',
          unsigned: true
        }
      ])
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  /**
   * Here we check if there are a field marked as "repeatable" in order to
   * create a table for this field.
   *
   * Also we create a table for the "select" field type with the select options
   * as the table vales.
   *
   * If we have a field with a "repeatable" set to true then we treat it as 1 to many
   * So we create a new table with the name [schemaNameFieldName] and we must add the
   * values to this table
   *
   * @param {Object} newSchema the schema that submitted from the frontend
   * @param {Boolean} alter do we update existing schema?
   * @param {Object} oldSchema the schema that already exist in the database
   */
  static async setUpRelations (newSchema, alter = false, oldSchema = null) {
    try {
      // We are creating a new schema
      if (!alter) {
        for (const field of newSchema.fields) {
          const fieldType = field.type

          if (fieldType === 'select') {
            await this.createOptionTable(field, newSchema)
          } else if ((field.repeatable && fieldType !== 'custom') ||
          fieldType === 'select' || fieldType === 'relation' || fieldType === 'upload') {
            if (fieldType === 'upload' || fieldType === 'relation') {
              // We have many-to-many relationship
              await this.createUploadOrRelationRelationalTable(
                field,
                fieldType,
                newSchema
              )
            } else {
              // We have one-to-many relationship
              // Create a table with one field(of course there is an id field) called "value"
              await this.createNormalRepeatableFieldRelationalTable(
                field,
                newSchema
              )
            }
          }
        }
      } else {
        // We updating existing schema
        // TODO probably clear some cache here(specially some content cache)
        for (const field of newSchema.fields) {
          const fieldType = field.type

          // We must check to see if the user add/removed options
          if (
            fieldType === 'select' ||
            fieldType === 'relation' ||
            (field.repeatable && fieldType !== 'custom') ||
            fieldType === 'upload'
          ) {
            const oldField = oldSchema.fields.find(i => i.id == field.id)

            if (fieldType === 'select') {
              if (oldField) {
                const optionsTableName = `${newSchema.name}-${field.name}-options`
                const oldOptionsTableName = `${oldSchema.name}-${oldField.name}-options`

                if (oldOptionsTableName !== optionsTableName) {
                  await aventum.knex.schema.renameTable(
                    oldOptionsTableName,
                    optionsTableName
                  )
                }

                const optionsRelationsTable = `${newSchema.name}-${field.name}`
                const oldOptionsRelationsTable = `${oldSchema.name}-${oldField.name}`

                if (optionsRelationsTable !== oldOptionsRelationsTable) {
                  await aventum.knex.schema.renameTable(
                    oldOptionsRelationsTable,
                    optionsRelationsTable
                  )
                }

                if (
                  optionsTableName !== oldOptionsTableName ||
                  oldSchema.name !== newSchema.name
                ) {
                  // First rename the column name
                  await aventum.knex.schema.alterTable(
                    optionsRelationsTable,
                    table => {
                      if (optionsTableName !== oldOptionsTableName) {
                        table.renameColumn(
                          `${oldOptionsTableName}Id`,
                          `${optionsTableName}Id`
                        )
                      }
                      if (oldSchema.name !== newSchema.name) {
                        table.renameColumn(
                          `${oldSchema.name}Id`,
                          `${newSchema.name}Id`
                        )
                      }
                    }
                  )
                }

                const existOptions = await aventum.knex(optionsTableName)

                let mustAdded = []
                const mustDelete = []
                const mustUpdate = []

                var { arrayUniqueByProperty } = require('../../std-helpers')

                field.options = arrayUniqueByProperty(field.options, 'value')

                for (const option of field.options) {
                  const currentField = existOptions.find(
                    o => o.value === option.value
                  )

                  // Field already exist, check if we need to update it
                  if (currentField) {
                    if (currentField.label !== option.label) {
                      mustUpdate.push(option)
                    }
                  } else {
                    // Option not exist, lets add it
                    mustAdded.push(option)
                  }
                }

                var { deletePropertiesFromObjects } = require('../../std-helpers')
                mustAdded = deletePropertiesFromObjects(mustAdded, ['uuid'])

                // Now check for the options that must removed
                for (const option of existOptions) {
                  const fieldExist = field.options.find(
                    o => o.value === option.value
                  )

                  // If the option exist in the database and not exist in the new field options
                  // The the user deleted it
                  if (!fieldExist) {
                    mustDelete.push(option.value)
                  }
                }

                const allPromises = [
                  aventum
                    .knex(optionsTableName)
                    .whereIn('value', mustDelete)
                    .del(),
                  aventum.knex(optionsTableName).insert(mustAdded)
                ]

                for (const u of mustUpdate) {
                  allPromises.push(
                    aventum
                      .knex(optionsTableName)
                      .where({ value: u.value })
                      .update({ label: u.label })
                  )
                }

                await Promise.all(allPromises)
              } else {
                await this.createOptionTable(field, newSchema)
              }
            } else {
              if (fieldType === 'upload' || fieldType === 'relation') {
                // We have many-to-many relationship
                if (!oldField) {
                  await this.createUploadOrRelationRelationalTable(
                    field,
                    fieldType,
                    newSchema
                  )
                } else {
                  let rfn
                  let oldRfn

                  if (fieldType === 'upload') {
                    rfn = oldRfn = 'uploads'
                  } else {
                    var allSchemas = await this.getAllSchemas()
                    rfn = allSchemas.find(s => s.id == field.reference).name
                    oldRfn = allSchemas.find(s => s.id == oldField.reference).name
                  }

                  const tableName = `${newSchema.name}-${rfn}-${field.name}`
                  const oldTableName = `${oldSchema.name}-${rfn}-${oldField.name}`

                  if (oldTableName !== tableName) {
                    await aventum.knex.schema.renameTable(
                      oldTableName,
                      tableName
                    )
                  }

                  // Is the reference changed(the user changed the referenced content)
                  if (oldRfn !== rfn || oldSchema.name !== newSchema.name) {
                    // We have content that have relation with itself like categories have child/children categories
                    const secondColumn = rfn === newSchema.name ? `child${rfn.capitalize()}Id` : `${rfn}Id`
                    // First rename the column name
                    await aventum.knex.schema.alterTable(tableName, table => {
                      if (oldRfn !== rfn) {
                        table.renameColumn(`${oldRfn}Id`, secondColumn)

                        table.dropForeign(`${oldRfn}Id`)
                        table
                          .foreign(secondColumn)
                          .references(`${rfn}.id`)
                          .onUpdate('CASCADE')
                          .onDelete('CASCADE')
                      }

                      if (oldSchema.name !== newSchema.name) {
                        table.renameColumn(
                          `${oldSchema.name}Id`,
                          `${newSchema.name}Id`
                        )
                      }
                    })

                    if (oldRfn !== rfn) {
                      // Delete all data
                      await aventum
                        .knex(tableName)
                        .where({})
                        .del()
                    }
                  }
                }
              } else {
                // Normal repeatable fields We have one-to-many relationship
                if (!oldField || (field.repeatable && !oldField.repeatable)) {
                  // Create a table with one field(of course there is an id field) called "value"
                  await this.createNormalRepeatableFieldRelationalTable(
                    field,
                    newSchema
                  )
                } else {
                  const tableName = `${newSchema.name}-${field.name}`
                  const oldTableName = `${oldSchema.name}-${oldField.name}`

                  if (oldTableName !== tableName) {
                    // If the field name changed then change the table name according to it
                    await aventum.knex.schema.renameTable(
                      oldTableName,
                      tableName
                    )
                  }

                  // Is the schema name changed
                  if (oldSchema.name !== newSchema.name) {
                    // First rename the column name
                    await aventum.knex.schema.alterTable(tableName, table => {
                      table.renameColumn(
                        `${oldSchema.name}Id`,
                        `${newSchema.name}Id`
                      )
                    })
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async createTableFromSchema (options) {
    try {
      const exists = await aventum.knex.schema.hasTable(options.name)
      if (!exists) {
        await aventum.knex.schema.createTable(options.name, table => {
          table
            .bigIncrements('id', 20)
            .primary()
            .unsigned()

          for (const field of options.fields) {
            this.setColumn(table, field)
          }

          table.string('status').defaultTo('publish')
          table.boolean('trash').notNullable().defaultTo(false)
          table.bigInteger('createdBy').unsigned()
          table.bigInteger('updatedBy').unsigned()
          table.datetime('createdAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))
          table.datetime('updatedAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))

          table.foreign('createdBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
          table.foreign('updatedBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
        })

        await this.setUpRelations(options)
      } else {
        return null
      }
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async deleteTable (options) {
    try {
      await aventum.knex.schema.dropTableIfExists(options.name)

      return true
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async alterTableFromSchema (options) {
    try {
      // TODO alter not supported by SQlite or Amazon Redshift

      // First we get the old version of the schema
      var oldSchema = await Schema.getSchema(options.id)

      // Second we compare the name of the schema which is the table name if it is changed or not
      if (oldSchema.name !== options.values.name) {
        // If the schema name changed then change the table name according to it
        await aventum.knex.schema.renameTable(
          oldSchema.name,
          options.values.name
        )
      }

      var relationalFieldsMustRemove = []

      // Third we loop through the new schema fields and compare them with the old one
      // Each schema field has a unique id, from it we know the old and new state of the field.
      await aventum.knex.schema.alterTable(options.values.name, table => {
        for (const newField of options.values.fields) {
          const oldField = oldSchema.fields.find(i => i.id == newField.id)

          // Do we have this field?
          if (oldField) {
            if (
              oldField.name !== newField.name &&
              oldField.type !== 'select' &&
              oldField.type !== 'relation' &&
              ((!newField.repeatable && oldField.type !== 'custom') ||
                (newField.repeatable && oldField.type === 'custom'))
            ) {
              table.renameColumn(oldField.name, newField.name)
            }

            // If the repeatable property changed
            if (oldField.repeatable && !newField.repeatable) {
              this.setColumn(table, newField)
            }
          } else {
            // Add new field
            this.setColumn(table, newField)
          }
        }

        // Now check if we have fields must removed
        const fieldsMustRemove = []
        for (const oField of oldSchema.fields) {
          const nField = options.values.fields.find(u => u.id == oField.id)
          if (!nField || (nField && (oField.repeatable !== nField.repeatable))) {
            fieldsMustRemove.push(oField)
          }
        }

        const normalFieldsMustRemove = []

        for (const f of fieldsMustRemove) {
          if (f.type !== 'select' && f.type !== 'relation' && ((!f.repeatable && f.type !== 'custom') ||
          (f.repeatable && f.type === 'custom'))) {
            normalFieldsMustRemove.push(f)
          } else {
            relationalFieldsMustRemove.push(f)
          }
        }

        if (normalFieldsMustRemove.length) {
          // The fields names is the columns names and we only need the name of the columns that must removed
          table.dropColumns(normalFieldsMustRemove.map(y => y.name))
        }
      })

      if (relationalFieldsMustRemove.length) {
        const tablesMustDelete = []

        for (const field of relationalFieldsMustRemove) {
          switch (field.type) {
            case 'relation':
            case 'upload':
            { let rfn
              if (field.type === 'upload') {
                rfn = 'uploads'
              } else {
                var allSchemas = await this.getAllSchemas()
                rfn = allSchemas.find(s => s.id == field.reference).name
              }

              tablesMustDelete.push(aventum.knex.schema.dropTable(`${options.values.name}-${rfn}-${field.name}`))
              break }

            case 'select':
              tablesMustDelete.push(aventum.knex.schema.dropTable(`${options.values.name}-${field.name}`))
              tablesMustDelete.push(aventum.knex.schema.dropTable(`${options.values.name}-${field.name}-options`))
              break

            default:
              if (field.repeatable && field.type !== 'custom') {
                tablesMustDelete.push(aventum.knex.schema.dropTable(`${options.values.name}-${field.name}`))
              }
              break
          }
        }

        var { sequentiallyResolvePromises } = require('../../std-helpers')
        await sequentiallyResolvePromises(tablesMustDelete)
      }

      await this.setUpRelations(options.values, true, oldSchema)

      return true
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async addSchema (req) {
    try {
      req.body.createdBy = req.user.id
      req.body.updatedBy = req.user.id

      const stringFields = req.body.fields
      const stringAcl = req.body.acl

      req.body.fields = JSON.parse(stringFields)
      req.body.acl = JSON.parse(stringAcl)

      // Create the table if not exist
      await this.createTableFromSchema(req.body)

      req.body.fields = stringFields

      var schema = new Schema(req.body)

      schema = await schema.save()

      return schema
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async getSchema (id, user = null) {
    var cacheKey = `schemas:g:${id}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        const allSchemas = await this.getAllSchemas()

        const schema = allSchemas.find(s => s.id == id)

        if (!schema) {
          return null
        }

        if (user && getStringID(user.id) !== getStringID(schema.createdBy)) {
          return 403
        }

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, schema)

        return schema
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async getSchemaByContent (content, user = null) {
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

  static async deleteById (id) {
    try {
      if (!id) {
        return null
      }

      var Schema = this

      var oldSchema = await Schema.getSchema(id)

      // Get relational tables names

      for (const field of oldSchema.fields) {
        switch (field.type) {
          case 'relation':
          case 'upload':
          { let rfn

            if (field.type === 'upload') {
              rfn = 'uploads'
            } else {
              var allSchemas = await Schema.getAllSchemas()
              rfn = allSchemas.find(s => s.id == field.reference).name
            }

            await this.deleteTable({ name: `${oldSchema.name}-${rfn}-${field.name}` })
            break }

          case 'select':
            await this.deleteTable({ name: `${oldSchema.name}-${field.name}` })
            await this.deleteTable({ name: `${oldSchema.name}-${field.name}-options` })
            break

          default:
            if (field.repeatable && field.type !== 'custom') {
              await this.deleteTable({ name: `${oldSchema.name}-${field.name}` })
            }
            break
        }
      }

      const tableDeleted = await this.deleteTable({ name: oldSchema.name })

      if (!tableDeleted) {
        return null
      }

      const schema = await Schema.del({ id })

      return schema
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async updateSchema (options) {
    try {
      const Schema = this

      const stringFields = options.values.fields
      const stringAcl = options.values.acl

      options.values.fields = JSON.parse(stringFields)
      options.values.acl = JSON.parse(stringAcl)

      const tableUpdated = await this.alterTableFromSchema(options)

      if (!tableUpdated) {
        return null
      }

      options.values.fields = stringFields

      const schema = await Schema.updateOne({
        where: { id: options.id },
        values: { ...options.values, updatedAt: aventum.knex.fn.now(6) }
      })

      return schema
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async getAllSchemas (user = null) {
    try {
      var Schema = this

      var cacheKey
      if (user) {
        cacheKey = `schemas:p:all:${user.id}`
      } else {
        cacheKey = 'schemas:p:all'
      }

      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        const query = {}
        if (user) {
          query.createdBy = user.id
        }

        var schemas = await Schema.find(query)

        schemas = schemas.map(s => {
          s.fields = JSON.parse(s.fields)
          s.acl = JSON.parse(s.acl)

          return s
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

  static async getSchemas (req, user = null) {
    try {
      var Schema = this

      var page = +req.query.page
      var query = req.query.query ? JSON.parse(req.query.query) : {}
      var sortBy = req.query.sortBy ? JSON.parse(req.query.sortBy) : 'id'
      var sortOrder = req.query.sortOrder
        ? JSON.parse(req.query.sortOrder)
        : 'DESC'

      if (user) {
        query.createdBy = user.id
      }

      var cacheKey
      if (user) {
        cacheKey = `schemas:p:${user.id}:` + req.originalUrl
      } else {
        cacheKey = 'schemas:p:' + req.originalUrl
      }

      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        var count = await Schema.count(query)
        const paginatorInstance = new Paginator(page, 20, count)

        var schemas = await Schema.find({
          where: query,
          offset: paginatorInstance.offset(),
          limit: paginatorInstance.perPage,
          sortBy,
          sortOrder
        })

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
}

module.exports = Schema

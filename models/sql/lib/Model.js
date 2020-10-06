class Model {
  constructor (table = null) {
    this.modelConfig = {
      sort: null,
      table,
      where: {},
      offset: null,
      limit: null,
      values: null,
      sortBy: 'id',
      sortOrder: 'DESC'
    }
  }

  /**
   * @returns {number} of rowsAffected
   */
  async del () {
    const rowsAffected = await aventum.knex(this.modelConfig.table)
      .where(this.modelConfig.where)
      .del()

    return rowsAffected
  }

  static async del (where) {
    const mod = new this()

    /**
     * Fires before deleting from the SQL databases
     *
     * @hook
     * @name sqlBeforeDelete
     * @type applyFilters
     * @since 1.0.0
     *
     * @param {Object} where the where clause
     * @param {Object} this the model
     * @param {Object} model the newly created model instance
     */
    where = await aventum.hooks.applyFilters('sqlBeforeDelete', where, this, mod)

    mod.modelConfig.where = where

    const res = await mod.del()

    return res
  }

  whereBuilder (options, count = false) {
    const knexObj = aventum.knex(this.modelConfig.table)
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
                  knexObj.where(ele)
                }
              }
            } else {
              knexObj.where(element)
            }
            break

          case 'whereIn':
            if (Array.isArray(element)) {
              if (element.length) {
                for (const ele of element) {
                  knexObj.whereIn(ele.column, ele.values)
                }
              }
            } else {
              knexObj.whereIn(element.column, element.values)
            }
            break

          case 'whereNotIn':
            if (Array.isArray(element)) {
              if (element.length) {
                for (const ele of element) {
                  knexObj.whereNotIn(ele.column, ele.values)
                }
              }
            } else {
              knexObj.whereNotIn(element.column, element.values)
            }
            break

          case 'orWhereNotIn':
            if (Array.isArray(element)) {
              if (element.length) {
                for (const ele of element) {
                  knexObj.orWhereNotIn(ele.column, ele.values)
                }
              }
            } else {
              knexObj.orWhereNotIn(element.column, element.values)
            }
            break

          case 'whereNot':
            if (Array.isArray(element)) {
              if (element.length) {
                for (const ele of element) {
                  knexObj.whereNot(ele.column, ele.values)
                }
              }
            } else {
              knexObj.whereNot(element.column, element.values)
            }
            break

          case 'orWhereIn':
            if (Array.isArray(element)) {
              if (element.length) {
                for (const ele of element) {
                  knexObj.orWhereIn(ele.column, ele.values)
                }
              }
            } else {
              knexObj.orWhereIn(element.column, element.values)
            }
            break

          case 'like':
            if (Array.isArray(element)) {
              if (element.length) {
                for (const ele of element) {
                  knexObj.where(ele.column, 'like', `%${ele.value}%`)
                }
              }
            } else {
              knexObj.where(element.column, 'like', `%${element.value}%`)
            }
            break

          case 'notLike':
            if (Array.isArray(element)) {
              if (element.length) {
                for (const ele of element) {
                  knexObj.whereNot(ele.column, 'like', `%${ele.value}%`)
                }
              }
            } else {
              knexObj.whereNot(element.column, 'like', `%${element.value}%`)
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
        knexObj.orderBy(sort.sortBy, sort.sortOrder)
      }
    }

    return knexObj
  }

  static async castRowsToThis (rows) {
    const modelsArray = []
    if (rows.length) {
      for (const row of rows) {
        const tmp = new this()
        for (const key in row) {
          if (Object.prototype.hasOwnProperty.call(row, key)) {
            let element
            if (key === 'id' || key.endsWith('Id')) {
              element = Number(row[key])
            } else {
              element = row[key]
            }
            tmp[key] = element
          }
        }
        modelsArray.push(tmp)
      }
    }

    return modelsArray
  }

  static async find (options = {}) {
    const mod = new this()

    options.where = options.where || {}
    options.sortBy = options.sortBy || 'id'
    options.sortOrder = options.sortOrder || 'DESC'

    var rows = await mod.whereBuilder(options)

    return this.castRowsToThis(rows)
  }

  async findRow () {
    const rows = await aventum.knex(this.modelConfig.table).where(this.modelConfig.where)

    if (rows.length) {
      for (const key in rows[0]) {
        if (Object.prototype.hasOwnProperty.call(rows[0], key)) {
          let element
          if (key === 'id' || key.endsWith('Id')) {
            element = Number(rows[0][key])
          } else {
            element = rows[0][key]
          }
          this[key] = element
        }
      }

      return this
    }

    return null
  }

  static async findRow (where) {
    const mod = new this()

    mod.modelConfig.where = where

    const res = await mod.findRow()

    return res
  }

  static async count (where = {}) {
    const mod = new this()

    let count = await mod.whereBuilder(where, true).count()

    // mod.modelConfig.where = where

    // let count = await aventum.knex(mod.modelConfig.table).where(where).count()

    count = count.length ? Number(count[0].count) : 0

    return count
  }

  async save () {
    // First insert the value
    // TODO the returning() not work in Amazon Redshift

    /**
     * Fires before save data into SQL database
     *
     * @hook
     * @name sqlBeforeSave
     * @type doAction
     * @since 1.0.0
     *
     * @param {Object} this the model instance
     */
    await aventum.hooks.doAction('sqlBeforeSave', this)

    if (this.beforeSave) {
      await this.beforeSave(this)
    }

    const rows = await aventum.knex(this.modelConfig.table)
      .returning('*')
      .insert(this.modelConfig.values)

    if (rows.length) {
      for (const key in rows[0]) {
        if (Object.prototype.hasOwnProperty.call(rows[0], key)) {
          let element
          if (key === 'id' || key.endsWith('Id')) {
            element = Number(rows[0][key])
          } else {
            element = rows[0][key]
          }
          this[key] = element
        }
      }

      return this
    }

    return null
  }

  static async create (values) {
    const mod = new this()

    /**
     * Fires before inserting data into the SQL database
     *
     * @hook
     * @name sqlBeforeCreate
     * @type applyFilters
     * @since 1.0.0
     *
     * @param {(Array|Object)} values the data that will inserted into the database
     * @param {Object} this the model
     * @param {Object} model the newly created model instance
     */
    mod.modelConfig.values = await aventum.hooks.applyFilters('sqlBeforeCreate', values, this, mod)

    if (this.beforeCreate) {
      await this.beforeCreate(mod)
    }

    let result = null
    // First insert the value
    // TODO the returning() not work in Amazon Redshift
    const rows = await aventum.knex(mod.modelConfig.table)
      .returning('*')
      .insert(mod.modelConfig.values)

    // If we inserted multiple rows
    if (Array.isArray(mod.modelConfig.values)) {
      result = this.castRowsToThis(rows)
    } else {
      if (rows.length) {
        const tmp = new this()
        for (const key in rows[0]) {
          if (Object.prototype.hasOwnProperty.call(rows[0], key)) {
            let element
            if (key === 'id' || key.endsWith('Id')) {
              element = Number(rows[0][key])
            } else {
              element = rows[0][key]
            }
            tmp[key] = element
          }
        }
        result = tmp
      }
    }

    return result
  }

  /**
   * Update one or multiple rows according to the where clause.
   * The result will be an array of the updated records as Model objects
   */
  static async update (options) {
    let mod = new this()

    mod.modelConfig.values = options.values
    mod.modelConfig.where = options.where
    /**
     * Fires before updating SQL data
     *
     * @hook
     * @name sqlBeforeUpdate
     * @type applyFilters
     * @since 1.0.0
     *
     * @param {Object} model the newly created model instance
     * @param {Object} this the model
     */
    mod = await aventum.hooks.applyFilters('sqlBeforeUpdate', mod, this)

    if (this.beforeUpdate) {
      await this.beforeUpdate(mod)
    }

    const rows = await aventum.knex(mod.modelConfig.table)
      .where(mod.modelConfig.where)
      .update(mod.modelConfig.values, ['*'])

    if (rows.length) {
      return this.castRowsToThis(rows)
    } else {
      return null
    }
  }

  static async set (options) {
    const mod = new this()

    await mod.set(options)
  }

  async set (options) {
    // If we will take userRole table as an example then this will be the userId
    const id = Number(options.id || this.id)

    // First select all the records in the linked table that related to our userId.
    // options.table is the userRole table in our example
    const records = await aventum.knex(options.table).where(options.sourceFieldName, id)

    var recordsTargetIds
    if (options.targetFieldNaN) {
      recordsTargetIds = records.map(r => r[options.targetFieldName])
    } else {
      recordsTargetIds = records.map(r => Number(r[options.targetFieldName]))
    }

    // If we will take userRole as an example then options.values is the roles array of ids that we want
    // to assign to the user
    let mustDeleted = []
    if (records.length) {
      // We must remove the records that not exist in the options.values
      if (options.targetFieldNaN) {
        mustDeleted = records.filter(r => !options.values.includes(r[options.targetFieldName]))
      } else {
        mustDeleted = records.filter(r => !options.values.includes(Number(r[options.targetFieldName])))
      }
    }

    if (mustDeleted.length) {
      const mustDeletedId = mustDeleted.map(i => i.id)
      await aventum.knex(options.table).whereIn('id', mustDeletedId).del()
    }

    const mustAdd = options.values.filter(i => !recordsTargetIds.includes(i))

    // In our userRole example the targetFieldName is roleId
    await aventum.knex(options.table).insert(mustAdd.map(a => ({ [options.sourceFieldName]: id, [options.targetFieldName]: a })))
  }

  static async setWithOrder (options) {
    const mod = new this()

    await mod.setWithOrder(options)
  }

  async setWithOrder (options) {
    const id = Number(options.id || this.id)

    const records = await aventum.knex(options.table).where(options.sourceFieldName, id)

    const mustUpdate = []
    const mustAdd = []

    options.values.forEach((value, index) => {
      const valueOrder = index + 1
      const exist = records.find(r => (options.targetFieldNaN ? r[options.targetFieldName] : options.targetFieldNaN) === value)

      if (exist) {
        if (exist.order !== valueOrder) {
          mustUpdate.push({ value, order: valueOrder })
        }
      } else {
        mustAdd.push({ value, order: valueOrder })
      }
    })

    const mustDeleted = records.filter(r => options.targetFieldNaN ? !options.values.includes(r[options.targetFieldName]) : !options.values.includes(Number(r[options.targetFieldName])))

    if (mustDeleted.length) {
      const mustDeletedId = mustDeleted.map(i => i.id)
      await aventum.knex(options.table).whereIn('id', mustDeletedId).del()
    }

    await aventum.knex(options.table).insert(mustAdd.map(a => ({ [options.sourceFieldName]: id, [options.targetFieldName]: a.value, order: a.order })))

    await Promise.all(mustUpdate.map(v => aventum.knex(options.table)
      .where({
        [options.sourceFieldName]: id,
        [options.targetFieldName]: v.value
      })
      .update({ order: v.order })))
  }

  static async updateOne (options) {
    /**
     * Fires before updating SQL data
     *
     * @hook
     * @name sqlBeforeUpdateOne
     * @type applyFilters
     * @since 1.0.0
     *
     * @param {Object} options the data that will updated with the where clause
     * @param {Object} this the model
     */
    options = await aventum.hooks.applyFilters('sqlBeforeUpdateOne', options, this)

    const tmp = await this.update(options)

    return tmp[0]
  }

  limit (limit) {
    this.modelConfig.limit = limit
    return this
  }

  offset (offset) {
    this.modelConfig.offset = offset
    return this
  }

  sortBy (sortBy) {
    this.modelConfig.sortBy = sortBy
    return this
  }

  sortOrder (sortOrder) {
    this.modelConfig.sortOrder = sortOrder
    return this
  }

  toString () {
    delete this.modelConfig
    let $this = this
    if ($this.transform) {
      $this = $this.transform($this)
    }
    return JSON.stringify($this)
  }

  toJSON () {
    delete this.modelConfig
    let $this = this
    if ($this.transform) {
      $this = $this.transform($this)
    }
    return $this
  }
}

module.exports = Model

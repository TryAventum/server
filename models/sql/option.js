const Model = require('./lib/Model')

class Option extends Model {
  constructor (values = null) {
    super('options')
    this.modelConfig.values = values
  }

  static async getOption (name) {
    var Option = this

    var cacheKey = `options:g:${name}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        var options = await Option.getAllOptions()

        const option = options.find(e => e.name === name)

        if (!option) {
          return null
        }

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, option)

        return option
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async updateOption (option) {
    const Option = this
    try {
      const opt = await Option.updateOne({
        where: { name: option.name },
        values: { value: option.value }
      })

      return opt
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async getAllOptions () {
    var Option = this

    var cacheKey = 'options:p:all'

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)

      // We found the cache
      if (!result.length) {
        throw new Error('Empty cache!')
      }
      return result
    } catch (e) {
      // No cache found
      try {
        var options = await Option.find({})

        options.push({
          name: 'DB_TYPE',
          value: process.env.DB_TYPE
        })

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, options)

        return options
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async bulkInsertRows (rows) {
    const Option = this

    const insertedRows = await Option.create(rows)

    return insertedRows
  }
}

module.exports = Option

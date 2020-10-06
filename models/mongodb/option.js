var mongoose = require('mongoose')

var OptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 250,
      unique: true,
      trim: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed
    }
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

OptionSchema.statics.updateOption = async function (option) {
  const Option = this

  try {
    await Option.update(
      { name: { $eq: option.name } },
      { $set: { value: option.value } },
      { runValidators: true }
    ).exec() // use exec to update documents without waiting for a response from MongoDB http://mongoosejs.com/docs/api.html#model_Model.update

    return true
  } catch (error) {
    throw new Error(error)
  }
}

OptionSchema.statics.getAllOptions = async function () {
  var Option = this

  var cacheKey = 'options:p:all'

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)

    // We found the cache
    if (!result.length) {
      throw new Error('Empty cache')
    }
    return result
  } catch (e) {
    // No cache found
    try {
      var options = await Option.find({})
        .sort({ _id: -1 })
        .exec()

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

OptionSchema.statics.getOption = async function (name) {
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

OptionSchema.statics.bulkInsertRows = async function (rows) {
  const Option = this

  const optionsDocuments = await Option.insertMany(rows)

  return optionsDocuments
}

var Option = mongoose.model('Option', OptionSchema)

module.exports = Option

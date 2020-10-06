var mongoose = require('mongoose')

var TranslationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 250,
      unique: true,
      trim: true
    },
    order: {
      type: Number
    },
    en: {
      type: String
    },
    ar: {
      type: String
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

TranslationSchema.statics.updateTranslations = async function (req) {
  const Translation = this

  try {
    var cacheKey = 'translations:p:all'

    const keys = req.body.translations.map(t => t.key)
    // Remove all documents except these ones
    await Translation.remove({ key: { $nin: keys } })

    const results = await Translation.bulkWrite(
      req.body.translations.map(translation => ({
        updateOne: {
          filter: { key: translation.key },
          update: { $set: translation },
          upsert: true
        }
      }))
    )

    aventum.cache.deleteKey(cacheKey)

    aventum.hooks.doActionSync('translationsUpdated', results, req)
    return results
  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

TranslationSchema.statics.getAllTranslations = async function () {
  var Translation = this

  var cacheKey = 'translations:p:all'

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      const query = {}

      var translations = await Translation.find(query)
        .sort({ _id: -1 })
        .exec()

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, translations)

      return translations
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

var Translation = mongoose.model('Translation', TranslationSchema)

module.exports = Translation

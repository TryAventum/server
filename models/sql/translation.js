const Model = require('./lib/Model')

class Translation extends Model {
  constructor (values = null) {
    super('translations')
    this.modelConfig.values = values
  }

  // TODO enhance this method
  static async updateTranslations (req) {
    const Translation = this

    try {
      const keys = req.body.translations.map(t => t.key)

      const mustUpdate = []
      const mustAdd = []

      const allTranslations = await this.getAllTranslations()

      var cacheKey = 'translations:p:all'
      aventum.cache.deleteKey(cacheKey)

      for (const trans of req.body.translations) {
        delete trans.uuidv1

        const exist = allTranslations.find(t => t.key === trans.key)

        if (exist) {
          let needUpdate = false
          for (const key in exist) {
            if (Object.prototype.hasOwnProperty.call(exist, key)) {
              if (exist[key] !== trans[key]) {
                needUpdate = true
              }
            }
          }

          if (needUpdate) {
            mustUpdate.push(trans)
          }
        } else {
          mustAdd.push(trans)
        }
      }

      const mustDeleteIds = allTranslations.filter(t => !keys.includes(t.key)).map(k => k.id)

      await Promise.all([
        ...mustUpdate.map(t => Translation.updateOne({ where: { id: t.id }, values: t })),
        aventum.knex('translations').whereIn('id', mustDeleteIds).del(),
        Translation.create(mustAdd)
      ])

      const newTranslations = await this.getAllTranslations()

      aventum.hooks.doActionSync('translationsUpdated', newTranslations, req)

      return newTranslations
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async getAllTranslations () {
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

        var translations = await Translation.find({ where: query })

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, translations)

        return translations
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }
}

module.exports = Translation

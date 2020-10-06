var mongoose = require('mongoose')

/**
 * This file code contain all of the event/middlewares that may cache/flush the cache of the schemas routes
 */
function deleteMongooseModel (schema, req, res) {
  /**
   * https://stackoverflow.com/a/53329374/3263601
   *
   * Without this we will receive OverwriteModelError: Cannot overwrite `schema.name` model once compiled.
   */
  try {
    mongoose.model(schema.name)
    mongoose.deleteModel(schema.name)
  } catch (e) {}

  aventum.cache.deleteKey(`schemaSchema:g:${schema.name}`)
}

aventum.hooks.addAction(
  'schemaUpdated',
  'Aventum/Core/cache/schemas',
  deleteMongooseModel
)
aventum.hooks.addAction(
  'schemaDeleted',
  'Aventum/Core/cache/schemas',
  deleteMongooseModel
)

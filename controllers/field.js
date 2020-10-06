var Field = require(process.env.DB_TYPE === 'mongodb'
  ? '../models/mongodb/field'
  : '../models/sql/field')
var isUndefined = require('lodash/fp/isUndefined')
var omitBy = require('lodash/fp/omitBy')
var flow = require('lodash/fp/flow')

module.exports.get = async (req, res) => {
  try {
    var result = await Field.getFields(
      req,
      req.readOthersCustomFields ? null : req.user
    )
    return res.send(result)
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.post = async (req, res) => {
  let data = {
    title: req.body.title,
    singularTitle: req.body.singularTitle,
    name: req.body.name.toLowerCase(),
    fields: JSON.stringify(req.body.fields),
    createdBy: req.user.id,
    updatedBy: req.user.id
  }

  data = flow(
    omitBy(isUndefined)
  )(data)

  try {
    var field = await Field.createField(data)

    aventum.hooks.doActionSync('fieldCreated', field, req, res)

    // Delete the cache of the GET /fields, GET /fields/all
    aventum.cache.batchDeletionKeysByPattern('fields:p:*')

    res.send(field)
  } catch (error) {
    res.status(400).send(error)
  }
}

module.exports.getAll = async (req, res) => {
  try {
    var fields = await Field.getAllFields(
      req,
      req.readOthersCustomFields ? null : req.user
    )
    return res.send({ fields })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getById = async (req, res) => {
  try {
    var field = await Field.getField(
      req.params.id,
      req.readOthersCustomField ? null : req.user
    )
    if (field === null) {
      return res.status(404).send()
    }
    if (field === 403) {
      return res.status(403).send()
    }
    return res.send({ field })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.deleteById = (req, res) => {
  var id = req.params.id

  var cacheKey = `fields:g:${id}`

  Field.deleteById(id)
    .then(field => {
      if (!field) {
        return res.status(404).send()
      }

      aventum.cache.deleteKey(cacheKey)
      aventum.cache.batchDeletionKeysByPattern('fields:p:*')

      aventum.hooks.doActionSync('fieldDeleted', field, req, res)

      res.send({ field })
    })
    .catch(e => {
      res.status(400).send()
    })
}

module.exports.patchById = (req, res) => {
  var id = req.params.id

  let data = {
    title: req.body.title,
    singularTitle: req.body.singularTitle,
    name: req.body.name.toLowerCase(),
    fields: JSON.stringify(req.body.fields),
    updatedBy: req.user.id,
    updatedAt: process.env.DB_TYPE === 'mongodb' ? new Date() : aventum.knex.fn.now(6)
  }

  data = flow(
    omitBy(isUndefined)
  )(data)

  var cacheKey = `fields:g:${id}`

  Field.updateField({ id, values: data })
    .then(field => {
      if (!field) {
        return res.status(404).send()
      }

      aventum.cache.deleteKey(cacheKey)
      aventum.cache.batchDeletionKeysByPattern('fields:p:*')

      aventum.hooks.doActionSync('fieldUpdated', field, req, res)
      res.send({ field })
    })
    .catch(e => {
      res.status(400).send()
    })
}

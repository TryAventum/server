var Schema = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/schema' : '../models/sql/schema')

module.exports.get = async (req, res) => {
  try {
    var result = await Schema.getSchemas(
      req,
      req.readOthersSchemas ? null : req.user
    )
    return res.send(result)
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.post = async (req, res) => {
  try {
    var schema = await Schema.addSchema(req)

    if (!schema) {
      return res.status(500).send()
    }

    aventum.hooks.doActionSync('schemaCreated', schema, req, res)

    // Delete the cache of the GET /schemas, GET /schemas/all
    aventum.cache.batchDeletionKeysByPattern('schemas:p:*')

    res.send(schema)
  } catch (error) {
    console.log(error)

    res.status(400).send()
  }
}

module.exports.getAll = async (req, res) => {
  try {
    const schemas = await Schema.getAllSchemas()

    return res.send({ schemas })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getById = async (req, res) => {
  try {
    var schema = await Schema.getSchema(
      req.params.id,
      req.readOthersSchema ? null : req.user
    )
    if (schema === null) {
      return res.status(404).send()
    }
    if (schema === 403) {
      return res.status(403).send()
    }
    return res.send({ schema })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.deleteById = async (req, res) => {
  try {
    var id = req.params.id

    var cacheKey = `schemas:g:${id}`

    const schema = await Schema.deleteById(id)

    if (!schema) {
      return res.status(404).send()
    }

    aventum.cache.deleteKey(cacheKey)
    aventum.cache.batchDeletionKeysByPattern('schemas:p:*')

    aventum.hooks.doActionSync('schemaDeleted', schema, req, res)

    res.send({ schema })
  } catch (error) {
    console.log(error)

    res.status(400).send()
  }
}

module.exports.patchById = (req, res) => {
  var id = req.params.id

  var cacheKey = `schemas:g:${id}`

  req.body.updatedBy = req.user.id
  req.body.updatedAt = process.env.DB_TYPE === 'mongodb' ? new Date() : aventum.knex.fn.now(6)

  Schema.updateSchema({
    id,
    values: req.body
  })
    .then(schema => {
      if (!schema) {
        return res.status(404).send()
      }

      aventum.cache.deleteKey(cacheKey)
      aventum.cache.batchDeletionKeysByPattern('schemas:p:*')

      aventum.hooks.doActionSync('schemaUpdated', schema, req, res)
      res.send({ schema })
    })
    .catch(e => {
      console.log(e)
      res.status(400).send(e)
    })
}

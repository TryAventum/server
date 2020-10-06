var { getModal } = require('../helpers')
const Joi = require('@hapi/joi')

module.exports.get = async (req, res) => {
  try {
    var content = req.params.content
    var cacheKey
    if (req.returnedDataRestriction === 'ownedData') {
      cacheKey = `contents:${content}:p:${req.user.id}:${req.originalUrl}`
    } else {
      cacheKey = `contents:${content}:p:${req.originalUrl}`
    }
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return res.send(result)
  } catch (e) {
    // No cache found
    try {
      const { model } = await getModal(content)

      var obj = await model.getContents(req)

      var ress = {
        contents: obj.contents,
        pagination: {
          totalPages: obj.paginatorInstance.totalPages(),
          perPage: obj.paginatorInstance.perPage,
          totalCount: obj.paginatorInstance.totalCount
        }
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, ress)

      res.send(ress)
    } catch (e) {
      console.log(e)
      res.status(400).send()
    }
  }
}

module.exports.post = async (req, res) => {
  const content = req.params.content

  try {
    const c = await req.model.postContent(req, res)

    aventum.hooks.doActionSync(`${content}ContentCreated`, c, req, res)

    // Delete the cache of the GET /contents, GET /contents/all
    aventum.cache.batchDeletionKeysByPattern(`contents:${content}:p:*`)

    res.send(c)
  } catch (error) {
    if (Joi.isError(error)) {
      res.status(422).send(error)
    } else {
      console.log(error)
      res.status(400).send()
    }
  }
}

module.exports.getAll = async (req, res) => {
  try {
    var content = req.params.content

    var cacheKey
    if (req.returnedDataRestriction === 'ownedData') {
      cacheKey = `contents:p:all:${content}:${req.user.id}:${req.originalUrl}`
    } else {
      cacheKey = `contents:p:all:${content}:${req.originalUrl}`
    }
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return res.send(result)
  } catch (e) {
    // No cache found
    try {
      const { model } = await getModal(content)

      var contents = await model.getAllContents(req)

      var ress = { contents }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, ress)

      res.send(ress)
    } catch (e) {
      console.log(e)
      res.status(400).send()
    }
  }
}

module.exports.getById = async (req, res) => {
  const content = req.params.content

  var cacheKey = `contents:${content}:g:${req.params.id}`

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return res.send(result)
  } catch (e) {
    // No cache found
    try {
      const { model } = await getModal(content)

      var cntnt = await model.getById(req)

      if (!cntnt) {
        return res.status(404).send()
      }

      var ress = { content: cntnt }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, ress)

      res.send(ress)
    } catch (e) {
      console.log(e)
      res.status(400).send()
    }
  }
}

module.exports.deleteById = async (req, res) => {
  const content = req.params.content

  var cacheKey = `contents:${content}:g:${req.params.id}`

  const { model } = await getModal(content)

  try {
    const c = await model.deleteById(req)

    if (!c) {
      return res.status(404).send()
    }

    aventum.cache.deleteKey(cacheKey)
    aventum.cache.batchDeletionKeysByPattern(`contents:${content}:p:*`)

    aventum.hooks.doActionSync('contentDeleted', c, req, res)

    res.send({ content: c })
  } catch (error) {
    console.log(error)
    res.status(400).send()
  }
}

module.exports.patchById = async (req, res) => {
  const content = req.params.content

  var cacheKey = `contents:${content}:g:${req.params.id}`

  const { model } = await getModal(content)

  try {
    const c = await model.patchById(req)

    if (!c) {
      return res.status(404).send()
    }

    aventum.cache.deleteKey(cacheKey)
    aventum.cache.batchDeletionKeysByPattern(`contents:${content}:p:*`)

    aventum.hooks.doActionSync('contentUpdated', c, req, res)
    res.send({ content: c })
  } catch (error) {
    console.log(error)
    res.status(400).send()
  }
}

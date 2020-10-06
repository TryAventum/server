var Capability = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/capability' : '../models/sql/capability')
var isUndefined = require('lodash/fp/isUndefined')
var omitBy = require('lodash/fp/omitBy')
var flow = require('lodash/fp/flow')
var { arrayUnique } = require('../std-helpers')

// module.exports.get = async (req, res) => {
//   try {
//     var result = await Capability.getCapabilities(
//       req,
//       req.readOthersCapabilities ? null : req.user
//     )
//     return res.send(result)
//   } catch (e) {
//     res.status(400).send()
//   }
// }

module.exports.post = (req, res) => {
  let data = {
    name: req.body.name,
    label: req.body.label,
    createdBy: req.user.id,
    updatedBy: req.user.id
  }

  data = flow(
    omitBy(isUndefined)
  )(data)

  var capability = new Capability(data)

  capability.save().then(
    capability => {
      if (!capability) {
        return res.status(500).send()
      }

      aventum.hooks.doActionSync('capabilityCreated', capability, req, res)

      // Delete the cache of the GET /capabilities, GET /capabilities/all
      aventum.cache.batchDeletionKeysByPattern('capabilities:p:*')

      res.send(capability)
    },
    e => {
      res.status(400).send(e)
    }
  )
}

module.exports.capabilitiesSetup = async (rolesCapabilities, req) => {
  try {
    let allCapabilities = []

    for (const role in rolesCapabilities) {
      allCapabilities = [...allCapabilities, ...rolesCapabilities[role]]
    }

    const transformedCapabilities = arrayUnique(allCapabilities).map(c => {
      return {
        name: c,
        label: c,
        reserved: true
      }
    })

    aventum.cache.batchDeletionKeysByPattern('capabilities:p:*')

    // setup the capabilities table and get all the capabilities
    const capabilitiesDocuments = await Capability.bulkInsertRows(
      transformedCapabilities
    )

    return capabilitiesDocuments
  } catch (error) {
    console.log(error)
    throw new Error()
  }
}

module.exports.getAll = async (req, res) => {
  try {
    var capabilities = await Capability.getAllCapabilities(
      req,
      req.readOthersCapabilities ? null : req.user
    )
    return res.send({ capabilities })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getById = async (req, res) => {
  try {
    var capability = await Capability.getCapability(
      req.params.id,
      req.readOthersCapability ? null : req.user
    )
    if (capability === null) {
      return res.status(404).send()
    }
    if (capability === 403) {
      return res.status(403).send()
    }
    return res.send({ capability })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.deleteById = (req, res) => {
  var id = req.params.id

  var cacheKey = `capabilities:g:${id}`

  Capability.deleteById(id)
    .then(capability => {
      if (!capability) {
        return res.status(404).send()
      }

      aventum.cache.deleteKey(cacheKey)
      aventum.cache.batchDeletionKeysByPattern('capabilities:p:*')

      aventum.hooks.doActionSync('capabilityDeleted', capability, req, res)

      res.send({ capability })
    })
    .catch(e => {
      res.status(400).send()
    })
}

module.exports.patchById = (req, res) => {
  var id = req.params.id
  var body = { label: req.body.label, name: req.body.name }

  body.updatedBy = req.user.id
  body.updatedAt = process.env.DB_TYPE === 'mongodb' ? new Date() : aventum.knex.fn.now(6)

  var cacheKey = `capabilities:g:${id}`

  body = flow(
    omitBy(isUndefined)
  )(body)

  Capability.updateCapability({
    id,
    values: body
  }).then(capability => {
    if (!capability) {
      return res.status(404).send()
    }

    aventum.cache.deleteKey(cacheKey)
    aventum.cache.batchDeletionKeysByPattern('capabilities:p:*')

    aventum.hooks.doActionSync('capabilityUpdated', capability, req, res)
    res.send({ capability })
  })
    .catch(e => {
      res.status(400).send()
    })
}

var Role = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/role' : '../models/sql/role')
var isUndefined = require('lodash/fp/isUndefined')
var omitBy = require('lodash/fp/omitBy')
var flow = require('lodash/fp/flow')
var {
  capabilitiesSetup
} = require('./capability')

module.exports.rolesSetup = async (req) => {
  try {
    // TODO setup only if not setup

    aventum.cache.batchDeletionKeysByPattern('roles:p:*')

    var rolesCapabilities = require('../packages/acl/rolesCapabilities.json')

    // setup the capabilities table and get all the capabilities
    const capabilitiesDocuments = await capabilitiesSetup(rolesCapabilities, req)

    const roles = await Role.setUpRoles(rolesCapabilities, capabilitiesDocuments)

    return roles
  } catch (error) {
    throw new Error(error)
  }
}

module.exports.getDefaultRole = async () => {
  const DEFAULT_ROLE = await Role.getDefaultRole()

  return DEFAULT_ROLE
}

module.exports.get = async (req, res) => {
  // try {
  //   var result = await Role.getRoles(req, req.readOthersRoles ? null : req.user)
  //   return res.send(result)
  // } catch (e) {
  //   res.status(400).send()
  // }
}

module.exports.post = async (req, res) => {
  try {
    let data = {
      label: req.body.label,
      name: req.body.name,
      capabilities: req.body.capabilities,
      createdBy: req.user.id,
      updatedBy: req.user.id
    }

    data = flow(
      omitBy(isUndefined)
    )(data)

    const role = await Role.createRole(data)

    aventum.hooks.doActionSync('roleCreated', role, req, res)

    // Delete the cache of the GET /roles, GET /roles/all
    aventum.cache.deleteKey('roleCapability:p:all')
    aventum.cache.batchDeletionKeysByPattern('roles:p:*')

    res.send(role)
  } catch (error) {
    res.status(400).send(error)
  }
}

module.exports.getAll = async (req, res) => {
  try {
    var roles = await Role.getAllRoles(
      req,
      req.readOthersRoles ? null : req.user
    )
    return res.send({ roles })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getById = async (req, res) => {
  try {
    var role = await Role.getRole(
      req.params.id,
      req.readOthersRole ? null : req.user
    )
    if (role === null) {
      return res.status(404).send()
    }
    if (role === 403) {
      return res.status(403).send()
    }
    return res.send({ role })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.deleteById = (req, res) => {
  var id = req.params.id

  var cacheKey = `roles:g:${id}`

  Role.deleteById(id)
    .then(role => {
      if (!role) {
        return res.status(404).send()
      }

      aventum.cache.deleteKey(cacheKey)
      aventum.cache.batchDeletionKeysByPattern('roles:p:*')

      aventum.hooks.doActionSync('roleDeleted', role, req, res)

      res.send({ role })
    })
    .catch(e => {
      res.status(400).send()
    })
}

module.exports.patchById = (req, res) => {
  var id = req.params.id
  var body = {
    label: req.body.label,
    name: req.body.name,
    capabilities: req.body.capabilities
  }

  body.updatedBy = req.user.id
  body.updatedAt = process.env.DB_TYPE === 'mongodb' ? new Date() : aventum.knex.fn.now(6)

  var cacheKey = `roles:g:${id}`

  body = flow(
    omitBy(isUndefined)
  )(body)

  Role.updateRole(
    { id, values: body }
  )
    .then(role => {
      if (!role) {
        return res.status(404).send()
      }

      aventum.cache.deleteKey(cacheKey)
      aventum.cache.deleteKey('roleCapability:p:all')
      aventum.cache.batchDeletionKeysByPattern('roles:p:*')

      aventum.hooks.doActionSync('roleUpdated', role, req, res)
      res.send({ role })
    })
    .catch(e => {
      res.status(400).send()
    })
}

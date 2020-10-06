var mongoose = require('mongoose')
const { ObjectID } = require('mongodb')
var { getStringID } = require('../../std-helpers')
var { getOptionValue } = require('../../helpers')
const { Paginator } = require('../../packages/paginator/index')

var RoleSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      minlength: 1,
      maxlength: 250,
      trim: true
    },
    name: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 250,
      unique: true,
      trim: true
    },
    reserved: {
      type: Boolean,
      default: false
    },
    capabilities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Capability'
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
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

RoleSchema.statics.createRole = async function (values) {
  try {
    const Role = this

    var role = new Role(values)

    role = await role.save()

    return role
  } catch (error) {
    throw new Error(error)
  }
}

RoleSchema.statics.getRoles = async function (req, user = null) {
  var Role = this

  const page = +req.query.page
  const searchTerm = req.query.q
  let query = {}

  if (searchTerm) {
    query = { label: { $regex: '.*' + searchTerm + '.*', $options: 'i' } }
  }

  if (user) {
    query.createdBy = user._id
  }

  var cacheKey
  if (user) {
    cacheKey = `roles:p:${user._id}:` + req.originalUrl
  } else {
    cacheKey = 'roles:p:' + req.originalUrl
  }

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var count = await Role.countDocuments(query).exec()
      const paginatorInstance = new Paginator(page, 20, count)

      var roles = await Role.find(query)
        .sort({ _id: -1 })
        .skip(paginatorInstance.offset())
        .limit(paginatorInstance.perPage)
        .exec()

      var ress = {
        roles,
        pagination: {
          totalPages: paginatorInstance.totalPages(),
          perPage: paginatorInstance.perPage,
          totalCount: paginatorInstance.totalCount
        }
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, ress)

      return ress
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

RoleSchema.statics.getAllRoles = async function (req = null, user = null) {
  var Role = this

  var cacheKey
  if (user) {
    cacheKey = `roles:p:all:${user._id}`
  } else {
    cacheKey = 'roles:p:all'
  }

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      const query = {}
      if (user) {
        query.createdBy = user._id
      }
      var roles = await Role.find(query)
        .populate('capabilities')
        .sort({ _id: -1 })
        .exec()

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, roles)

      return roles
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

RoleSchema.statics.getRole = async function (_id, user = null) {
  var Role = this

  var cacheKey = `roles:g:${_id}`

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var role = await Role.findOne({
        _id
      })
        .populate('capabilities')
        .exec()

      if (!role) {
        return null
      }

      if (user && getStringID(user._id) !== getStringID(role.createdBy)) {
        return 403
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, role)

      return role
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

RoleSchema.statics.updateRole = async function (options) {
  var Role = this

  if (!ObjectID.isValid(options.id)) {
    return null
  }

  try {
    const role = await Role.findOneAndUpdate(
      { _id: options.id },
      { $set: options.values },
      { new: true, runValidators: true }
    )

    return role
  } catch (error) {
    console.log(error)
    return null
  }
}

RoleSchema.statics.deleteById = async function (id) {
  var Role = this

  if (!ObjectID.isValid(id)) {
    return null
  }

  try {
    const role = await Role.findOneAndRemove({
      _id: id
    })

    return role
  } catch (error) {
    console.log(error)

    return null
  }
}

RoleSchema.statics.setUpRoles = async function (
  rolesCapabilities,
  capabilitiesDocuments
) {
  let transformedRoles = []

  for (const role in rolesCapabilities) {
    transformedRoles = [
      ...transformedRoles,
      {
        name: role,
        label: role,
        reserved: true,
        capabilities: rolesCapabilities[role].map(c => {
          return capabilitiesDocuments.find(e => e.name === c)._id
        })
      }
    ]
  }

  // setup the roles table and get all the roles
  const rolesDocuments = await Role.insertMany(transformedRoles)

  return rolesDocuments
}

RoleSchema.statics.getDefaultRole = async function () {
  var Role = this

  const defaultRoleName = await getOptionValue('DEFAULT_ROLE')

  const allRoles = await Role.getAllRoles()

  var defaultRole = allRoles.find(r => r.name === defaultRoleName)

  return defaultRole
}

var Role = mongoose.model('Role', RoleSchema)

module.exports = Role

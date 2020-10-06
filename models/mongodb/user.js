const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const Joi = require('@hapi/joi')
const bcrypt = require('bcryptjs')
var isUndefined = require('lodash/fp/isUndefined')
var omitBy = require('lodash/fp/omitBy')
var flow = require('lodash/fp/flow')
const { ObjectID } = require('mongodb')
var { gender, providers } = require('../../commons')
var randomize = require('randomatic')
const { Paginator } = require('../../packages/paginator/index')
var Role = require('./role')
const { ACL } = require('../../packages/acl/acl')
var {
  passwordHasher,
  queryParser,
  getMongoDBSortOrderStyle,
  getMongoDBSortByStyle
} = require('../../helpers')

function isEmail (value) {
  const schema = Joi.string()
    .email({ minDomainSegments: 2, tlds: false })

  const { error } = schema.validate(value)

  if (error) {
    return false
  }
  return true
}

var UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      minlength: 1,
      maxlength: 250,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      minlength: 1,
      maxlength: 250,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 250,
      unique: true,
      validate: {
        isAsync: false,
        validator: isEmail,
        message: '{VALUE}' + aventum.i18n.t('IsNotValidEmail')
      }
    },
    emailConfirmation: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    picture: {
      type: String
    },
    gender: {
      type: String,
      enum: gender
    },
    provider: {
      type: String,
      enum: providers
    },
    birthday: {
      type: Date
    },
    tokens: [
      {
        access: {
          type: String,
          required: true
        },
        token: {
          type: String,
          required: true
        },
        ip: {
          type: String
        },
        userAgent: {
          type: String
        },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
      }
    ],
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

UserSchema.methods.toJSON = function () {
  var user = this
  var userObject = user.toObject()

  return {
    _id: userObject._id,
    id: userObject._id,
    firstName: userObject.firstName,
    lastName: userObject.lastName,
    birthday: userObject.birthday,
    gender: userObject.gender,
    picture: userObject.picture,
    email: userObject.email,
    roles: userObject.roles,
    capabilities: userObject.capabilities,
    emailConfirmation: userObject.emailConfirmation
  }
}

if (!UserSchema.options.toObject) UserSchema.options.toObject = {}
UserSchema.options.toObject.transform = function (doc, ret, options) {
  delete ret.password
  delete ret.provider
  delete ret.tokens
  return ret
}

UserSchema.methods.generateAuthToken = async function (req) {
  var user = this
  var access = 'auth'
  var { getOptionValue } = require('../../helpers')
  var JWT_SECRET = await getOptionValue('JWT_SECRET')
  var token = jwt
    .sign({ _id: user._id.toHexString(), access }, JWT_SECRET, {
      expiresIn: '180d'
    })
    .toString()

  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

  user.tokens.push({
    access,
    token,
    ip: JSON.stringify(ip),
    userAgent: req.headers['user-agent']
  })

  return user.save().then(() => {
    return token
  })
}

UserSchema.statics.postNewUser = async function (req) {
  try {
    var body = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      birthday: req.body.birthday,
      gender: req.body.gender,
      picture: req.body.picture,
      email: req.body.email,
      password: req.body.password,
      roles: req.body.roles,
      capabilities: req.body.capabilities
    }

    if (req.user) {
      body.createdBy = req.user._id
      body.updatedBy = req.user._id
    }

    const DEFAULT_ROLE = await Role.getDefaultRole()
    body.capabilities = body.capabilities ? body.capabilities : []
    body.roles = body.roles ? body.roles : [DEFAULT_ROLE._id]
    body.createdBy = req.user._id

    const user = new User(body)
    await user.save()

    return user
  } catch (e) {
    console.log(e)
    return null
  }
}

UserSchema.statics.generateAuthToken = async function (req) {
  const user = req.user

  var User = this
  var access = 'auth'

  var userID
  if (typeof user._id === 'object') {
    userID = user._id.toHexString()
  } else {
    var id = mongoose.Types.ObjectId(user._id)
    userID = id.toHexString()
  }

  var { getOptionValue } = require('../../helpers')

  var JWT_SECRET = await getOptionValue('JWT_SECRET')

  var token = jwt
    .sign({ _id: userID, access }, JWT_SECRET, { expiresIn: '180d' })
    .toString()

  return new Promise((resolve, reject) => {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

    User.update(
      { _id: { $eq: user._id } },
      {
        $push: {
          tokens: {
            access,
            token,
            ip: JSON.stringify(ip),
            userAgent: req.headers['user-agent']
          }
        }
      },
      { runValidators: true }
    )
      .exec()
      .then(r => {
        resolve(token)
      })
      .catch(e => {
        reject(e)
      })
  })
}

UserSchema.methods.generateForgotPasswordToken = async function (req) {
  var user = this
  var access = 'forgotPassword'
  var { getOptionValue } = require('../../helpers')
  var JWT_SECRET = await getOptionValue('JWT_SECRET')
  var token = jwt
    .sign({ _id: user._id.toHexString(), access }, JWT_SECRET, {
      expiresIn: '48h'
    })
    .toString()

  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

  user.tokens.push({
    access,
    token,
    ip: JSON.stringify(ip),
    userAgent: req.headers['user-agent']
  })

  return user.save().then(() => {
    return token
  })
}

UserSchema.methods.generateEmailConfirmationToken = async function (req) {
  var user = this
  var access = 'emailConfirmation'
  var { getOptionValue } = require('../../helpers')
  var JWT_SECRET = await getOptionValue('JWT_SECRET')
  var token = jwt
    .sign({ _id: user._id.toHexString(), access }, JWT_SECRET, {
      expiresIn: '48h'
    })
    .toString()

  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

  user.tokens.push({
    access,
    token,
    ip: JSON.stringify(ip),
    userAgent: req.headers['user-agent']
  })

  return user.save().then(() => {
    return token
  })
}

UserSchema.statics.generateEmailConfirmationToken = async function (req) {
  const user = req.user
  var User = this
  var access = 'emailConfirmation'

  var userID
  if (typeof user._id === 'object') {
    userID = user._id.toHexString()
  } else {
    var id = mongoose.Types.ObjectId(user._id)
    userID = id.toHexString()
  }

  var { getOptionValue } = require('../../helpers')

  var JWT_SECRET = await getOptionValue('JWT_SECRET')

  var token = jwt
    .sign({ _id: userID, access }, JWT_SECRET, { expiresIn: '48h' })
    .toString()

  return new Promise((resolve, reject) => {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

    User.update(
      { _id: { $eq: user._id } },
      {
        $push: {
          tokens: {
            access,
            token,
            ip: JSON.stringify(ip),
            userAgent: req.headers['user-agent']
          }
        }
      },
      { runValidators: true }
    )
      .exec()
      .then(r => {
        resolve(token)
      })
      .catch(e => {
        reject(e)
      })
  })
}

/**
 * provider like: 'facebook' or 'google'
 */
UserSchema.methods.generateProviderLoginToken = async function (provider, req) {
  var user = this
  var access = `${provider}Provider`
  var { getOptionValue } = require('../../helpers')
  var JWT_SECRET = await getOptionValue('JWT_SECRET')
  var token = jwt
    .sign({ _id: user._id.toHexString(), access }, JWT_SECRET, {
      expiresIn: 60
    })
    .toString()

  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

  user.tokens.push({
    access,
    token,
    ip: JSON.stringify(ip),
    userAgent: req.headers['user-agent']
  })

  return user.save().then(() => {
    return token
  })
}

UserSchema.methods.generateFileToken = async function (req) {
  var user = this
  var access = 'file'
  var { getOptionValue } = require('../../helpers')
  var JWT_SECRET = await getOptionValue('JWT_SECRET')
  var token = jwt
    .sign({ _id: user._id.toHexString(), access }, JWT_SECRET, {
      expiresIn: '1d'
    })
    .toString()

  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

  user.tokens.push({
    access,
    token,
    ip: JSON.stringify(ip),
    userAgent: req.headers['user-agent']
  })

  return user.save().then(() => {
    return token
  })
}

UserSchema.statics.generateFileToken = async function (req) {
  const user = req.user
  var User = this
  var access = 'file'

  var userID
  if (typeof user._id === 'object') {
    userID = user._id.toHexString()
  } else {
    var id = mongoose.Types.ObjectId(user._id)
    userID = id.toHexString()
  }

  var { getOptionValue } = require('../../helpers')

  var JWT_SECRET = await getOptionValue('JWT_SECRET')

  var token = jwt
    .sign({ _id: userID, access }, JWT_SECRET, { expiresIn: '1d' })
    .toString()

  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

  return new Promise((resolve, reject) => {
    User.update(
      { _id: { $eq: user._id } },
      {
        $push: {
          tokens: {
            access,
            token,
            ip: JSON.stringify(ip),
            userAgent: req.headers['user-agent']
          }
        }
      },
      { runValidators: true }
    )
      .exec()
      .then(r => {
        resolve(token)
      })
      .catch(e => {
        reject(e)
      })
  })
}

UserSchema.statics.updateUser = async function (options) {
  try {
    options.values = flow(
      omitBy(isUndefined),
      omitBy(val => val === '')
    )(options.values)

    if (options.req.user) {
      options.values.updatedBy = options.req.user._id
      options.values.updatedAt = new Date()
    }

    const user = await User.findOneAndUpdate(
      { _id: options.id },
      { $set: options.values },
      { new: true, runValidators: true }
    )

    return user
  } catch (error) {
    console.log(error)
    return null
  }
}

UserSchema.statics.getUsersByRolesNames = async roles => {
  const User = this
  try {
    var idsOfAdminAndSuper = await ACL.rolesNamesToIDs(roles)

    var users = await User.find({ roles: { $in: idsOfAdminAndSuper } }).exec()

    return users
  } catch (e) {
    console.log(e)
    throw new Error(e)
  }
}

UserSchema.statics.addUserWithRole = async function (userData, role) {
  try {
    userData.roles = role._id

    const user = new User(userData)
    await user.save()

    return user
  } catch (e) {
    console.log(e)
    return null
  }
}

UserSchema.statics.deleteUserById = async function (id) {
  if (!ObjectID.isValid(id)) {
    return null
  }

  try {
    const user = await User.findOneAndRemove({
      _id: id
    })

    return user
  } catch (error) {
    console.log(error)
    return null
  }
}

UserSchema.methods.removeToken = function (token) {
  var user = this

  return user
    .update(
      {
        $pull: {
          tokens: { token }
        }
      },
      { runValidators: true }
    )
    .exec()
}

UserSchema.statics.removeToken = function (userID, token) {
  var User = this
  return User.update(
    { _id: { $eq: userID } },
    {
      $pull: {
        tokens: { token }
      }
    },
    { runValidators: true }
  ).exec()
}

UserSchema.methods.findTokenByAccess = function (access) {
  var user = this

  var tokenObject = user.tokens.find(t => t.access === access)

  if (tokenObject && tokenObject.token) {
    return tokenObject.token
  }

  return false
}

UserSchema.statics.findTokenByAccess = function (req, access) {
  var User = this
  return new Promise((resolve, reject) => {
    if (req.user.tokens && req.user.tokens.length) {
      var tokenObject = req.user.tokens.find(t => t.access === access)
      if (tokenObject && tokenObject.token) {
        return resolve(tokenObject.token)
      }
    }

    // In case the current user doesn't have the tokens array then get the user
    User.findOne({
      _id: req.user._id,
      'tokens.access': access
    })
      .exec()
      .then(u => {
        if (u) {
          // Add the tokens array to the current user for caching purpose
          req.user.tokens = u.tokens
          var tokenObject = u.tokens.find(t => t.access === access)
          if (tokenObject && tokenObject.token) {
            resolve(tokenObject.token)
          } else {
            reject(new Error(401))
          }
        } else {
          reject(new Error(401))
        }
      })
      .catch(e => {
        reject(e)
      })
  })
}

UserSchema.statics.findByToken = async function (token, access = 'auth') {
  var User = this
  var decoded

  var { getOptionValue } = require('../../helpers')

  var JWT_SECRET = await getOptionValue('JWT_SECRET')

  try {
    decoded = jwt.verify(token, JWT_SECRET)
  } catch (e) {
    throw aventum.i18n.t('InvalidToken')
  }

  var cacheKey = `users:g:${decoded._id}${token}`

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    if (result) {
      // We found the cache
      return result
    } else {
      throw aventum.i18n.t('NoCacheFound')
    }
  } catch (e) {
    // No cache found
    try {
      var u = await User.findOne({
        _id: decoded._id,
        'tokens.token': token,
        'tokens.access': access
      }).exec()

      // u = u.toObject()

      aventum.cache.cacheByKey(cacheKey, u, 7200)

      return u
    } catch (e) {
      console.log(e)
      throw aventum.i18n.t('CantGetUserFromDB')
    }
  }
}

UserSchema.statics.findByCredentials = function (email, password) {
  var User = this

  return User.findOne({ email }).then(user => {
    if (!user) {
      return Promise.reject(new Error(404))
    }

    return new Promise((resolve, reject) => {
      // Use bcrypt.compare to compare password and user.password
      bcrypt.compare(password, user.password, (err, res) => {
        if (err) {
          reject(new Error(401))
        }
        if (res) {
          resolve(user)
        } else {
          reject(new Error(401))
        }
      })
    })
  })
}

UserSchema.statics.getPaginatedUsers = async function (req, user = null) {
  var User = this

  const page = +req.query.page
  var query = req.query.query ? JSON.parse(req.query.query) : {}
  var sortBy = query.sortBy ? getMongoDBSortByStyle(query.sortBy) : '_id'
  var sortOrder = query.sortOrder
    ? getMongoDBSortOrderStyle(query.sortOrder)
    : -1

  query = queryParser(query)

  if (user) {
    query.createdBy = user._id
  }

  var cacheKey
  if (user) {
    cacheKey = `users:p:${user._id}:` + req.originalUrl
  } else {
    cacheKey = 'users:p:' + req.originalUrl
  }

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var count = await User.countDocuments(query).exec()
      const paginatorInstance = new Paginator(page, 20, count)

      var users = await User.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(paginatorInstance.offset())
        .limit(paginatorInstance.perPage)
        .exec()

      var ress = {
        users,
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

UserSchema.statics.customGetUser = async function (_id, user = null) {
  if (!ObjectID.isValid(_id)) {
    return null
  }

  var User = this

  var cacheKey = `users:g:${_id}`

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      const user = await User.findOne({
        _id
      }).exec()

      if (!user) {
        return null
      }

      // Cache this value
      aventum.cache.cacheByKey(cacheKey, user)

      return user
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }
}

UserSchema.statics.getAllUsersCount = async function (req, user = null) {
  try {
    var count = await User.countDocuments().exec()

    return count
  } catch (e) {
    console.log(e)
    return null
  }
}

UserSchema.statics.findByEmail = function (email) {
  var User = this

  return User.findOne({ email }).then(user => {
    if (!user) {
      return Promise.reject(new Error(404))
    }

    return Promise.resolve(user)
  })
}

UserSchema.statics.customFindOrCreate = async function (
  profile,
  authToken = false,
  req
) {
  var User = this
  try {
    var user = await User.findByEmail(profile.email)

    /**
     * We found the user
     */
    var token
    if (authToken) {
      token = await user.generateAuthToken(req)
    } else {
      token = await user.generateProviderLoginToken(profile.provider, req)
    }

    aventum.hooks.doActionSync('loginSuccess', user, token, req)

    return { user, token }
  } catch (e) {
    /**
     * We didn't find the user
     */
    try {
      const userData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        provider: profile.provider,
        password: randomize('*', 20),
        emailConfirmation: true
      }

      if (req.user) {
        userData.createdBy = req.user._id
        userData.updatedBy = req.user._id
      }

      const DEFAULT_ROLE = await Role.getDefaultRole()
      userData.roles = [DEFAULT_ROLE._id]

      const user = new User(userData)
      await user.save()
      let token
      if (authToken) {
        token = await user.generateAuthToken(req)
      } else {
        token = await user.generateProviderLoginToken(profile.provider, req)
      }
      return { user, token }
    } catch (e) {
      throw new Error(e)
    }
  }
}

UserSchema.pre('findOneAndUpdate', async function () {
  if (this.getUpdate().$set.password) {
    this.getUpdate().$set.password = await passwordHasher(
      this.getUpdate().$set.password
    )
  }
})

UserSchema.pre('save', async function (next) {
  var user = this

  if (user.isModified('password')) {
    user.password = await passwordHasher(user.password)
    next()
  } else {
    next()
  }
})

UserSchema.statics.getUsers = async function (req, user = null) {
  var User = this

  const page = +req.query.page
  var query = req.query.query ? JSON.parse(req.query.query) : {}
  var sortBy = req.query.sortBy ? JSON.parse(req.query.sortBy) : '_id'
  var sortOrder = req.query.sortOrder ? JSON.parse(req.query.sortOrder) : -1

  if (user) {
    query.createdBy = user._id
  }

  var cacheKey
  if (user) {
    cacheKey = `users:p:${user._id}:` + req.originalUrl
  } else {
    cacheKey = 'users:p:' + req.originalUrl
  }

  try {
    // Check do we have a cache
    var result = await aventum.cache.getByKey(cacheKey)
    // We found the cache
    return result
  } catch (e) {
    // No cache found
    try {
      var count = await User.countDocuments(query).exec()
      const paginatorInstance = new Paginator(page, 20, count)

      var users = await User.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(paginatorInstance.offset())
        .limit(paginatorInstance.perPage)
        .exec()

      var ress = {
        users,
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

var User = mongoose.model('User', UserSchema)

module.exports = User

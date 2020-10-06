const Model = require('./lib/Model')
const Token = require('./token')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
var randomize = require('randomatic')

var Role = require('./role')
const UserRole = require('./userRole')
const UserCapability = require('./userCapability')

const { Paginator } = require('../../packages/paginator/index')

class User extends Model {
  constructor (values = null) {
    super('users')
    this.modelConfig.values = values
  }

  transform ($this) {
    delete $this.password
    delete $this.provider
    delete $this.createdBy
    return $this
  }

  async beforeSave ($this) {
    var { passwordHasher } = require('../../helpers')

    if (Object.prototype.hasOwnProperty.call($this.modelConfig.values, 'password')) {
      $this.modelConfig.values.password = await passwordHasher($this.modelConfig.values.password)
    }
  }

  static async findByToken (token, access = 'auth') {
    var decoded

    var { getOptionValue } = require('../../helpers')

    var JWT_SECRET = await getOptionValue('JWT_SECRET')

    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (e) {
      throw new Error(aventum.i18n.t('InvalidToken'))
    }

    var cacheKey = `users:g:${decoded.id}${token}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      if (result) {
        // We found the cache
        return result
      } else {
        throw new Error(aventum.i18n.t('NoCacheFound'))
      }
    } catch (e) {
      // No cache found
      try {
        // get the userToken
        const userToken = await Token.findRow({
          userId: decoded.id,
          token,
          access
        })

        if (!userToken) {
          return null
        }

        const user = await this.customGetUser(userToken.userId)

        aventum.cache.cacheByKey(cacheKey, user, 7200)

        return user
      } catch (e) {
        console.log(e)
        throw new Error(aventum.i18n.t('CantGetUserFromDB'))
      }
    }
  }

  static async beforeCreate ($this) {
    var { passwordHasher } = require('../../helpers')

    if (Object.prototype.hasOwnProperty.call($this.modelConfig.values, 'password')) {
      $this.modelConfig.values.password = await passwordHasher($this.modelConfig.values.password)
    }
  }

  static async beforeUpdate ($this) {
    var { passwordHasher } = require('../../helpers')

    if (Object.prototype.hasOwnProperty.call($this.modelConfig.values, 'password')) {
      $this.modelConfig.values.password = await passwordHasher($this.modelConfig.values.password)
    }
  }

  async generateProviderLoginToken (provider, req) {
    var user = this
    var access = `${provider}Provider`
    var { getOptionValue } = require('../../helpers')
    var JWT_SECRET = await getOptionValue('JWT_SECRET')
    var token = jwt
      .sign({ id: user.id, access }, JWT_SECRET, {
        expiresIn: 60
      })
      .toString()

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

    await Token.create({
      access,
      token,
      ip: JSON.stringify(ip),
      userAgent: req.headers['user-agent'],
      userId: user.id
    })

    return token
  }

  async generateEmailConfirmationToken (req) {
    var user = this
    var access = 'emailConfirmation'
    var { getOptionValue } = require('../../helpers')
    var JWT_SECRET = await getOptionValue('JWT_SECRET')
    var token = jwt
      .sign({ id: user.id, access }, JWT_SECRET, {
        expiresIn: '48h'
      })
      .toString()

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

    await Token.create({
      access,
      token,
      ip: JSON.stringify(ip),
      userAgent: req.headers['user-agent'],
      userId: user.id
    })

    return token
  }

  async generateForgotPasswordToken (req) {
    var user = this
    var access = 'forgotPassword'
    var { getOptionValue } = require('../../helpers')
    var JWT_SECRET = await getOptionValue('JWT_SECRET')
    var token = jwt
      .sign({ id: user.id, access }, JWT_SECRET, {
        expiresIn: '48h'
      })
      .toString()

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

    await Token.create({
      access,
      token,
      ip: JSON.stringify(ip),
      userAgent: req.headers['user-agent'],
      userId: user.id
    })

    return token
  }

  async removeToken (token) {
    var user = this

    await Token.del({
      token,
      userId: user.id
    })
  }

  static async removeToken (userID, token) {
    await Token.del({
      token,
      userId: userID
    })
  }

  static async setRelations (users) {
    try {
      const newUsers = []
      for (const user of users) {
        const [allUserRole, allUserCapability] = await Promise.all([
          UserRole.getAll(user.id),
          UserCapability.getAll(user.id)
        ])

        const allUserCapabilityIds = allUserCapability.map(uc => uc.capabilityId)
        const allUserRoleIds = allUserRole.map(uc => uc.roleId)

        user.roles = allUserRoleIds
        user.capabilities = allUserCapabilityIds

        newUsers.push(user)
      }

      return newUsers
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async generateEmailConfirmationToken (req) {
    const user = req.user
    var access = 'emailConfirmation'
    var { getOptionValue } = require('../../helpers')
    var JWT_SECRET = await getOptionValue('JWT_SECRET')
    var token = jwt
      .sign({ id: user.id, access }, JWT_SECRET, {
        expiresIn: '48h'
      })
      .toString()

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

    await Token.create({
      access,
      token,
      ip: JSON.stringify(ip),
      userAgent: req.headers['user-agent'],
      userId: user.id
    })

    return token
  }

  static async generateAuthToken (req) {
    const user = req.user

    var access = 'auth'

    var { getOptionValue } = require('../../helpers')

    var JWT_SECRET = await getOptionValue('JWT_SECRET')

    var token = jwt
      .sign({ id: user.id, access }, JWT_SECRET, { expiresIn: '180d' })
      .toString()

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

    await Token.create({
      access,
      token,
      ip: JSON.stringify(ip),
      userAgent: req.headers['user-agent'],
      userId: user.id
    })

    return token
  }

  async generateAuthToken (req) {
    var user = this
    var access = 'auth'
    var { getOptionValue } = require('../../helpers')
    var JWT_SECRET = await getOptionValue('JWT_SECRET')
    var token = jwt
      .sign({ id: user.id, access }, JWT_SECRET, {
        expiresIn: '180d'
      })
      .toString()

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

    await Token.create({
      access,
      token,
      ip: JSON.stringify(ip),
      userAgent: req.headers['user-agent'],
      userId: user.id
    })

    return token
  }

  static async postNewUser (req) {
    try {
      var userData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        birthday: req.body.birthday,
        gender: req.body.gender,
        picture: req.body.picture,
        email: req.body.email,
        password: req.body.password,
        createdBy: req.user.id
      }

      if (req.user) {
        userData.createdBy = req.user.id
        userData.updatedBy = req.user.id
      }

      const user = await User.create(userData)

      // body.capabilities is array of the capabilities ids
      if (req.body.capabilities) {
        await aventum.knex('userCapability').insert(
          req.body.capabilities.map(c => ({ userId: user.id, capabilityId: c }))
        ) // Add records to userCapability table
      }

      // body.roles is array of the roles ids
      if (req.body.roles) {
        await aventum.knex('userRole').insert(
          req.body.roles.map(c => ({ userId: user.id, roleId: c }))
        ) // Add records to userRole table
      } else {
        const DEFAULT_ROLE = await Role.getDefaultRole()

        await aventum.knex('userRole').insert({
          userId: user.id,
          roleId: DEFAULT_ROLE.id
        }) // Add record to userRole table
      }

      return user
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  static async addUserWithRole (userData, role) {
    const User = this
    try {
      let user = await User.create(userData)

      await aventum.knex('userRole').insert({ userId: user.id, roleId: role.id })

      user = await this.setRelations([user])
      user = user[0]

      return user
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  static async getUsersByRolesNames (rolesNames) {
    try {
      const users = await aventum.knex.schema.raw(`select users.* from users, roles, "userRole" 
      where roles.name in (${rolesNames.map(_ => '?').join(',')}) 
      and roles.id="userRole"."roleId" 
      and users.id="userRole"."userId";`, rolesNames)

      return this.castRowsToThis(users.rows)
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  static async deleteUserById (id) {
    if (!id) {
      return null
    }

    var User = this

    try {
      const user = await User.del({ id })

      return user
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static findByEmail (email) {
    var User = this

    return User.findRow({ email }).then(user => {
      if (!user) {
        return Promise.reject(new Error(404))
      }

      return Promise.resolve(user)
    })
  }

  static async findByCredentials (email, password) {
    try {
      var User = this

      let user = await User.findRow({ email })

      if (!user) {
        throw new Error(404)
      }

      const res = await bcrypt.compare(password, user.password)

      if (res) {
        user = await this.setRelations([user])
        user = user[0]
        return user
      } else {
        throw new Error()
      }
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async customGetUser (id, forUser = null) {
    if (!id) {
      return null
    }

    var User = this

    var cacheKey = `users:g:${id}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        var user = await User.findRow({ id })

        if (!user) {
          return null
        }

        user = await this.setRelations([user])

        user = user[0]

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, user)

        return user
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async getPaginatedUsers (req, user = null) {
    var User = this

    const page = +req.query.page
    var query = req.query.query ? JSON.parse(req.query.query) : {}

    if (user) {
      if (query.where) {
        query.where.createdBy = user.id
      } else {
        query.where = {}
        query.where.createdBy = user.id
      }
    }

    var cacheKey
    if (user) {
      cacheKey = `users:p:${user.id}:` + req.originalUrl
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
        var count = await User.count(query)
        const paginatorInstance = new Paginator(page, 20, count)

        var users = await User.find({
          ...query,
          offset: paginatorInstance.offset(),
          limit: paginatorInstance.perPage
        })

        users = await this.setRelations(users)

        var ress = {
          users: users,
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

  static async getAllUsersCount (req, user = null) {
    var User = this

    try {
      var count = await User.count()

      return count
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async customFindOrCreate (profile, authToken = false, req) {
    var User = this
    try {
      var user = await User.findRow({ email: profile.email })

      if (!user) {
        throw new Error(404)
      }

      /**
       * We found the user
       */
      var token
      if (authToken) {
        token = await user.generateAuthToken(req)
      } else {
        token = await user.generateProviderLoginToken(profile.provider, req)
      }

      user = await this.setRelations([user])

      aventum.hooks.doActionSync('loginSuccess', user[0], token, req)

      return { user: user[0], token }
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
          userData.createdBy = req.user.id
          userData.updatedBy = req.user.id
        }

        const user = await User.create(userData)

        const DEFAULT_ROLE = await Role.getDefaultRole()

        await aventum.knex('userRole').insert({
          userId: user.id,
          roleId: DEFAULT_ROLE.id
        }) // Add record to userRole table

        let token
        if (authToken) {
          token = await user.generateAuthToken(req)
        } else {
          token = await user.generateProviderLoginToken(
            profile.provider,
            req
          )
        }
        return { user, token }
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async updateUser (options) {
    try {
      const User = this

      const userRoles = options.values.roles
      const userCapabilities = options.values.capabilities

      delete options.values.roles
      delete options.values.capabilities

      if (options.req.user) {
        options.values.updatedBy = options.req.user.id
        options.values.updatedAt = aventum.knex.fn.now(6)
      }

      const user = await User.updateOne({
        where: { id: options.id },
        values: options.values
      })

      if (userRoles) {
        await user.set({ values: userRoles, sourceFieldName: 'userId', targetFieldName: 'roleId', table: 'userRole' })
      }

      if (userCapabilities) {
        await user.set({ values: userCapabilities, sourceFieldName: 'userId', targetFieldName: 'capabilityId', table: 'userCapability' })
      }

      return user
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }
}

module.exports = User

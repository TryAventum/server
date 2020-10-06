var Role = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/role' : '../models/sql/role')
var User = require(process.env.DB_TYPE === 'mongodb'
  ? '../models/mongodb/user'
  : '../models/sql/user')
const { EmailHelper } = require('../packages/email-helper/index')
var isUndefined = require('lodash/fp/isUndefined')
var omitBy = require('lodash/fp/omitBy')
var flow = require('lodash/fp/flow')
var { getStringID } = require('../std-helpers')
var { optionsSetup } = require('./option')
var { rolesSetup } = require('./role')
var { getDefaultRole } = require('./role')

var {
  getOptionValue
} = require('../helpers')

module.exports.getAuthFacebookCallback = async (req, res) => {
  const FRONTEND_URL = await getOptionValue('FRONTEND_URL')
  res.redirect(`${FRONTEND_URL}/login/facebook/${req.user.token}`)
}

module.exports.postAuthByProviderToken = async (req, res) => {
  try {
    var request = require('request-promise')
    var provider = req.params.provider
    var body = { accessToken: req.body.accessToken, userID: req.body.userID }

    if (provider === 'facebook') {
      var data = {
        method: 'GET',
        uri: `https://graph.facebook.com/v2.12/${body.userID}`,
        qs: {
          access_token: body.accessToken,
          fields: 'name, email, first_name, last_name'
        },
        json: true
      }
    } else if (provider === 'google') {
      data = {
        method: 'GET',
        uri: 'https://www.googleapis.com/oauth2/v1/userinfo',
        qs: {
          access_token: body.accessToken
        },
        json: true
      }
    }

    const response = await request(data)

    var result = await User.customFindOrCreate(
      {
        email: response.email,
        firstName: response.firstName || response.first_name,
        lastName: response.lastName || response.last_name,
        provider
      },
      true,
      req
    )

    var cacheKey = `users:g:${getStringID(result.user.id)}${result.token}`
    aventum.cache.cacheByKey(cacheKey, result.user, 7200)

    res.header('x-access-token', result.token).send(result.user)
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.deleteUserById = async (req, res) => {
  try {
    const id = req.params.id

    const user = await User.deleteUserById(id)

    if (!user) {
      return res.status(404).send()
    }

    aventum.cache.batchDeletionKeysByPattern(`users:g:${id}*`)
    aventum.cache.batchDeletionKeysByPattern('users:p:*')

    res.send({ user })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.postNewUser = async (req, res) => {
  try {
    const user = await User.postNewUser(req)

    aventum.cache.batchDeletionKeysByPattern('users:p:*')

    res.send({ user })
  } catch (e) {
    res.status(400).send(e)
  }
}

module.exports.getUserById = async (req, res) => {
  try {
    var user = await User.customGetUser(
      req.params.id,
      req.readOthersUser ? null : req.user
    )
    if (user === null) {
      return res.status(404).send()
    }
    if (user === 403) {
      return res.status(403).send()
    }
    return res.send({ user })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getAllUsersCount = async (req, res) => {
  try {
    var count = await User.getAllUsersCount()

    return res.send({ count })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getPaginatedUsers = async (req, res) => {
  try {
    var result = await User.getPaginatedUsers(
      req,
      req.readOthersUsers ? null : req.user
    )
    return res.send(result)
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getAuthGoogleCallback = async function (req, res) {
  const FRONTEND_URL = await getOptionValue('FRONTEND_URL')
  res.redirect(`${FRONTEND_URL}/login/google/${req.user.token}`)
}

// module.exports.get = async (req, res) => {
//   try {
//     var result = await User.getUsers(req, req.readOthersUsers ? null : req.user)
//     return res.send(result)
//   } catch (e) {
//     res.status(400).send()
//   }
// }

module.exports.getMe = async (req, res) => {
  req.user = await aventum.hooks.applyFilters('onSendUser', req.user, req, res)
  res.send(req.user)
}

module.exports.getCount = async (req, res) => {
  try {
    var count = await User.countDocuments().exec()

    return res.send({ count })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getById = async (req, res) => {
  try {
    var user = await User.getUser(
      req.params.id,
      req.readOthersUser ? null : req.user
    )
    if (user === null) {
      return res.status(404).send()
    }
    if (user === 403) {
      return res.status(403).send()
    }
    return res.send({ user })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.deleteById = async (req, res) => {
  try {
    const id = req.params.id

    const user = await User.deleteUserById(id)

    if (!user) {
      return res.status(404).send()
    }

    aventum.cache.batchDeletionKeysByPattern(`users:g:${id}*`)
    aventum.cache.batchDeletionKeysByPattern('users:p:*')

    res.send({ user })
  } catch (e) {
    res.status(400).send()
  }
}

// module.exports.post = async (req, res) => {
//   try {
//     var body = {
//       name: req.body.name,
//       birthday: req.body.birthday,
//       gender: req.body.gender,
//       email: req.body.email,
//       password: req.body.password,
//       roles: req.body.roles,
//       capabilities: req.body.capabilities
//     }

//     const DEFAULT_ROLE = await getOptionValue('DEFAULT_ROLE')
//     const allRoles = await Role.getAllRoles()
//     body.capabilities = body.capabilities ? body.capabilities : []
//     body.roles = body.roles
//       ? body.roles
//       : [allRoles.find(r => r.name === DEFAULT_ROLE).id]
//     body.createdBy = req.user.id

//     const user = new User(body)
//     await user.save()

//     aventum.cache.batchDeletionKeysByPattern(`users:p:*`)

//     res.send({ user })
//   } catch (e) {
//     res.status(400).send(e)
//   }
// }

// module.exports.postSetup = async (req, res) => {
//   try {
//     //If there are any users then the database is set up
//     const count = await User.estimatedDocumentCount().exec()

//     if (count) {
//       return res.status(409).send()
//     }

//     var body = {
//       name: req.body.name,
//       birthday: req.body.birthday,
//       gender: req.body.gender,
//       email: req.body.email,
//       password: req.body.password
//     }

//     //1) Setup the default options
//     await setupOptionsTable()

//     //2) Create the roles & capabilities table
//     const roles = await setupRolesTable()

//     body.roles = [roles.find(e => e.name === 'super').id]

//     const user = new User(body)
//     await user.save()

//     const token = await user.generateAuthToken(req)

//     //Now send the confirmation email
//     const confirmationToken = await user.generateEmailConfirmationToken(req)

//     const FRONTEND_URL = await getOptionValue('FRONTEND_URL')

//     const confirmationLink =
//       FRONTEND_URL + '/email-confirmation/' + confirmationToken

//     EmailHelper.sendRegistrationEmail(user.email, confirmationLink, req).then(
//       i => {},
//       e => {}
//     )

//     var cacheKey = `users:g:${getStringID(user.id)}${token}`
//     aventum.cache.cacheByKey(cacheKey, user, 7200)

//     res.header('x-access-token', token).send(user)
//   } catch (e) {
//     res.status(400).send(e)
//   }
// }

module.exports.registerUser = async (req, res) => {
  try {
    var body = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      birthday: req.body.birthday,
      gender: req.body.gender,
      picture: req.body.picture,
      email: req.body.email,
      password: req.body.password,
      passwordConfirmation: req.body.passwordConfirmation
    }

    if (body.password !== body.passwordConfirmation) {
      return res.status(400).send()
    }

    const DEFAULT_ROLE = await getDefaultRole()

    delete body.passwordConfirmation

    const insertedUserData = await module.exports.addNewUserWithConfEmail(
      body,
      DEFAULT_ROLE,
      req
    )

    var cacheKey = `users:g:${getStringID(insertedUserData.user.id)}${
      insertedUserData.token
    }`
    aventum.cache.cacheByKey(cacheKey, insertedUserData.user, 7200)

    res.header('x-access-token', insertedUserData.token).send(insertedUserData.user)
  } catch (e) {
    res.status(400).send(e)
  }
}

module.exports.addNewUserWithConfEmail = async (userData, role, req) => {
  try {
    const user = await User.addUserWithRole(userData, role)

    const token = await user.generateAuthToken(req)

    // Now send the confirmation email
    const confirmationToken = await user.generateEmailConfirmationToken(req)

    const FRONTEND_URL = await getOptionValue('FRONTEND_URL')

    const confirmationLink =
      FRONTEND_URL + '/email-confirmation/' + confirmationToken

    EmailHelper.sendRegistrationEmail(user.email, confirmationLink, req).then(
      i => {},
      e => {}
    )

    return { user, token }
  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

module.exports.postSetup = async (req, res) => {
  try {
    // If there are any users then the database is set up
    var count = await User.getAllUsersCount()

    if (count) {
      return res.status(409).send()
    }

    var userData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      birthday: req.body.birthday,
      gender: req.body.gender,
      picture: req.body.picture,
      email: req.body.email,
      password: req.body.password
    }

    // 1) Setup the default options
    await optionsSetup()

    // 2) Create the roles & capabilities table
    const roles = await rolesSetup(req)

    const insertedUserData = await module.exports.addNewUserWithConfEmail(
      userData,
      roles.find(e => e.name === 'super'),
      req
    )

    req.user = insertedUserData.user

    var cacheKey = `users:g:${getStringID(insertedUserData.user.id)}${
      insertedUserData.token
    }`
    aventum.cache.cacheByKey(cacheKey, insertedUserData.user, 7200)

    res.header('x-access-token', insertedUserData.token).send(insertedUserData.user)
  } catch (e) {
    res.status(400).send(e)
  }
}

module.exports.postRegister = async (req, res) => {
  try {
    var body = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      birthday: req.body.birthday,
      gender: req.body.gender,
      picture: req.body.picture,
      email: req.body.email,
      password: req.body.password,
      passwordConfirmation: req.body.passwordConfirmation
    }

    if (body.password !== body.passwordConfirmation) {
      return res.status(400).send()
    }

    delete body.passwordConfirmation

    const DEFAULT_ROLE = await getOptionValue('DEFAULT_ROLE')
    const allRoles = await Role.getAllRoles()
    body.roles = [allRoles.find(r => r.name === DEFAULT_ROLE).id]

    const user = new User(body)
    await user.save()

    const token = await user.generateAuthToken(req)

    // Now send the confirmation email
    const confirmationToken = await user.generateEmailConfirmationToken(req)

    const FRONTEND_URL = await getOptionValue('FRONTEND_URL')

    const confirmationLink =
      FRONTEND_URL + '/email-confirmation/' + confirmationToken

    EmailHelper.sendRegistrationEmail(user.email, confirmationLink, req).then(
      i => {},
      e => {}
    )

    var cacheKey = `users:g:${getStringID(user.id)}${token}`
    aventum.cache.cacheByKey(cacheKey, user, 7200)

    res.header('x-access-token', token).send(user)
  } catch (e) {
    res.status(400).send(e)
  }
}

module.exports.patchChangeEmail = async (req, res) => {
  try {
    if (req.body.email && req.body.email !== req.user.email) {
      const body = { email: req.body.email, emailConfirmation: false }

      let user = await User.updateUser({
        id: req.user.id,
        values: body,
        req
      })

      if (!user) {
        return res.status(404).send()
      }

      // Now send the confirmation email
      const confirmationToken = await user.generateEmailConfirmationToken(req)

      const FRONTEND_URL = await getOptionValue('FRONTEND_URL')

      const confirmationLink =
        FRONTEND_URL + '/email-confirmation/' + confirmationToken

      EmailHelper.newEmailConfirmation(user.email, confirmationLink, req).then(
        i => {},
        e => {}
      )

      var stringUserID = getStringID(user.id)
      aventum.cache.batchDeletionKeysByPattern(`users:g:${stringUserID}*`)
      aventum.cache.batchDeletionKeysByPattern('users:p:*')
      var cacheKey = `users:g:${stringUserID}${req.token}`
      aventum.cache.cacheByKey(cacheKey, user, 7200)

      user = await aventum.hooks.applyFilters('onSendUser', user, req, res)
      res.send({ user })
    } else {
      res.status(400).send()
    }
  } catch (e) {
    res.status(400).send(e)
  }
}

module.exports.postResendConfirmationEmail = async (req, res) => {
  try {
    const confirmationToken = await User.generateEmailConfirmationToken(req)

    const FRONTEND_URL = await getOptionValue('FRONTEND_URL')
    const confirmationLink =
      FRONTEND_URL + '/email-confirmation/' + confirmationToken

    await EmailHelper.resendConfirmationEmail(
      req.user.email,
      confirmationLink,
      req
    )
    res.status(200).send()
  } catch (e) {
    res.status(400).send(e)
  }
}

module.exports.patchChangePassword = async (req, res) => {
  var body = {
    newPassword: req.body.newPassword,
    passwordConfirmation: req.body.passwordConfirmation
  }

  body = flow(
    omitBy(isUndefined)
  )(body)

  if (body.newPassword !== body.passwordConfirmation) {
    return res.status(400).send()
  }

  body = { password: body.newPassword }

  User.updateUser(
    {
      id: req.user.id,
      values: body,
      req
    }
  )
    .then(async user => {
      if (!user) {
        return res.status(404).send()
      }

      user = await aventum.hooks.applyFilters('onSendUser', user, req, res)
      res.send({ user })
    })
    .catch(e => {
      res.status(400).send()
    })
}

module.exports.patchProfile = async (req, res) => {
  try {
    var body = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      birthday: req.body.birthday,
      gender: req.body.gender,
      picture: req.body.picture,
      email: req.body.email,
      password: req.body.password
    }

    body = flow(
      omitBy(isUndefined),
      omitBy(val => val === '')
    )(body)

    let user = await User.updateUser({
      id: req.user.id,
      values: body,
      req
    })

    if (!user) {
      return res.status(404).send()
    }

    var stringUserID = getStringID(user.id)
    aventum.cache.batchDeletionKeysByPattern(`users:g:${stringUserID}*`)
    aventum.cache.batchDeletionKeysByPattern('users:p:*')
    var cacheKey = `users:g:${stringUserID}${req.token}`
    aventum.cache.cacheByKey(cacheKey, user, 7200)

    user = await aventum.hooks.applyFilters('onSendUser', user, req, res)
    res.send({ user })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.patchById = async (req, res) => {
  try {
    var id = req.params.id
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

    body = flow(
      omitBy(isUndefined),
      omitBy(val => val === '')
    )(body)

    const user = await User.updateUser({
      id,
      values: body,
      req
    })

    if (!user) {
      return res.status(404).send()
    }

    aventum.cache.batchDeletionKeysByPattern(`users:g:${id}*`)
    aventum.cache.batchDeletionKeysByPattern('users:p:*')
    aventum.cache.deleteKey(`userRole:p:all:${id}`)
    aventum.cache.deleteKey(`userCapability:p:all:${id}`)

    return res.send({ user })
  } catch (error) {
    res.status(400).send()
  }
}

module.exports.postLoginProvider = async (req, res) => {
  try {
    const token = await User.generateAuthToken(req)

    aventum.hooks.doActionSync('loginSuccess', req.user, token, req)

    var cacheKey = `users:g:${getStringID(req.user.id)}${token}`
    aventum.cache.cacheByKey(cacheKey, req.user, 7200)

    req.user = await aventum.hooks.applyFilters(
      'onSendUser',
      req.user,
      req,
      res
    )
    res.header('x-access-token', token).send(req.user)
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.postLogin = async (req, res) => {
  try {
    var body = { email: req.body.email, password: req.body.password }
    var user = await User.findByCredentials(body.email, body.password)
    var token = await user.generateAuthToken(req)

    aventum.hooks.doActionSync('loginSuccess', user, token, req)

    var cacheKey = `users:g:${getStringID(user.id)}${token}`
    aventum.cache.cacheByKey(cacheKey, user, 7200)

    user = await aventum.hooks.applyFilters('onSendUser', user, req, res)
    res.header('x-access-token', token).send(user)
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.postEmailExist = async (req, res) => {
  try {
    await User.findByEmail(req.body.email)
    res.status(200).send()
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.postResetPassword = async (req, res) => {
  var body = { password: req.body.password }

  body = flow(
    omitBy(isUndefined)
  )(body)

  if (body.password) {
    User.updateUser({
      id: req.user.id,
      values: body,
      req
    }).then(user => {
      if (!user) {
        return res.status(404).send()
      }

      res.status(200).send()
    })
      .catch(e => {
        res.status(400).send()
      })
  } else {
    res.status(400).send()
  }
}

module.exports.postEmailConfirmation = (req, res) => {
  User.updateUser({
    id: req.user.id,
    values: { emailConfirmation: true },
    req
  }).then(user => {
    if (!user) {
      return res.status(404).send()
    }

    aventum.cache.batchDeletionKeysByPattern(
        `users:g:${getStringID(user.id)}*`
    )
    aventum.cache.batchDeletionKeysByPattern('users:p:*')

    res.status(200).send()
  })
    .catch(e => {
      res.status(400).send()
    })
}

module.exports.postForgotPassword = async (req, res) => {
  try {
    var body = { email: req.body.email }
    const user = await User.findByEmail(body.email)
    const token = await user.generateForgotPasswordToken(req)
    const FRONTEND_URL = await getOptionValue('FRONTEND_URL')
    const resetLink = FRONTEND_URL + '/reset-password/' + token

    // Send email to the user with reset password link
    EmailHelper.sendForgotPasswordEmail(user.email, resetLink, req)
      .then(info => {
        res.status(200).send()
      })
      .catch(error => {
        return res.status(400).send(error)
      })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.deleteMyToken = async (req, res) => {
  try {
    var userID = getStringID(req.user.id)
    await User.removeToken(userID, req.token)
    aventum.cache.deleteKey(`users:g:${userID}${req.token}`)
    res.status(200).send()
  } catch (e) {
    res.status(400).send()
  }
}

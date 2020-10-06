var express = require('express')
var router = express.Router()
var usersController = require('../controllers/user')

var { authenticate } = require('../middleware/authenticate')
var { isFacebookLoginEnabled } = require('../middleware/isFacebookLoginEnabled')
var { isRegistrationEnabled } = require('../middleware/isRegistrationEnabled')
var rateLimiterMiddleware = require('../middleware/rateLimiterMiddleware')
var { facebookAuth } = require('../controllers/facebookAuth')
var { facebookAuthCallback } = require('../controllers/facebookAuthCallback')
var { isGoogleLoginEnabled } = require('../middleware/isGoogleLoginEnabled')
var { googleAuth } = require('../controllers/googleAuth')
var { googleAuthCallback } = require('../controllers/googleAuthCallback')
var {
  authenticateProviderLogin
} = require('../middleware/authenticateProviderLogin')
var {
  authenticateForgotPassword
} = require('../middleware/authenticateForgotPassword')
var {
  authenticateEmailConfirmation
} = require('../middleware/authenticateEmailConfirmation')
var { sensitiveAuthenticate } = require('../middleware/sensitiveAuthenticate')

var {
  markReadOthersUsers
} = require('../middleware/capabilities/user/markReadOthersUsers')
var { readUsers } = require('../middleware/capabilities/user/readUsers')
var { readUser } = require('../middleware/capabilities/user/readUser')
var {
  markReadOthersUser
} = require('../middleware/capabilities/user/markReadOthersUser')
var { deleteUser } = require('../middleware/capabilities/user/deleteUser')
var {
  mustDeleteOthersUser
} = require('../middleware/capabilities/user/mustDeleteOthersUser')
var { createUser } = require('../middleware/capabilities/user/createUser')
var { updateUser } = require('../middleware/capabilities/user/updateUser')
var {
  mustUpdateOthersUser
} = require('../middleware/capabilities/user/mustUpdateOthersUser')

/**
 * Other scopes: user_birthday
 */
router.get('/auth/facebook', isFacebookLoginEnabled, facebookAuth)// TODO check this

router.get(// TODO check this
  '/auth/facebook/callback',
  [isFacebookLoginEnabled, facebookAuthCallback],
  usersController.getAuthFacebookCallback
)

router.post(
  '/authByProviderToken/:provider',
  rateLimiterMiddleware,
  usersController.postAuthByProviderToken
)

router.get('/auth/google', isGoogleLoginEnabled, googleAuth)// TODO check this

router.get(// TODO check this
  '/auth/google/callback',
  [isGoogleLoginEnabled, googleAuthCallback],
  usersController.getAuthGoogleCallback
)
/**
 * End Google authentication
 */

router.get(
  '/',
  [authenticate, readUsers, markReadOthersUsers],
  usersController.getPaginatedUsers
)

router.get('/me', authenticate, usersController.getMe)

router.get('/count', [authenticate, readUsers], usersController.getAllUsersCount)

router.get(
  '/:id',
  [authenticate, readUser, markReadOthersUser],
  usersController.getUserById
)

router.delete(
  '/:id',
  [authenticate, deleteUser, mustDeleteOthersUser],
  usersController.deleteUserById
)

router.post('/', [authenticate, createUser], usersController.postNewUser)

router.post('/setup', rateLimiterMiddleware, usersController.postSetup)

router.post('/register', rateLimiterMiddleware, isRegistrationEnabled, usersController.registerUser)

router.patch(
  '/change-email',
  [sensitiveAuthenticate],
  usersController.patchChangeEmail
)

router.post(
  '/resendConfirmationEmail',
  authenticate,
  usersController.postResendConfirmationEmail
)

router.patch(
  '/change-password',
  [sensitiveAuthenticate],
  usersController.patchChangePassword
)

router.patch('/profile', [authenticate], usersController.patchProfile)

router.patch(
  '/:id',
  [authenticate, updateUser, mustUpdateOthersUser],
  usersController.patchById
)

router.post(
  '/login/:provider/provider',
  authenticateProviderLogin,
  usersController.postLoginProvider
)

router.post('/login', rateLimiterMiddleware, usersController.postLogin)

router.post('/emailExist', usersController.postEmailExist)

router.post(
  '/resetPassword',
  authenticateForgotPassword,
  usersController.postResetPassword
)

router.post(
  '/emailConfirmation',
  authenticateEmailConfirmation,
  usersController.postEmailConfirmation
)

router.post(
  '/forgotPassword',
  rateLimiterMiddleware,
  usersController.postForgotPassword
)

router.delete('/my/token', authenticate, usersController.deleteMyToken)

module.exports = router

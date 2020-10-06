var User = require(process.env.DB_TYPE === 'mongodb'
  ? '../models/mongodb/user'
  : '../models/sql/user')

var passport = require('passport')
var FacebookStrategy = require('passport-facebook').Strategy
var { getOptionValue } = require('../helpers')
var facebookAuthCallback = async (req, res, next) => {
  try {
    const FACEBOOK_PROVIDER_CLIENT_ID = await getOptionValue(
      'FACEBOOK_PROVIDER_CLIENT_ID'
    )
    const FACEBOOK_PROVIDER_CLIENT_SECRET = await getOptionValue(
      'FACEBOOK_PROVIDER_CLIENT_SECRET'
    )
    const APP_URI = await getOptionValue('APP_URI')
    const FRONTEND_URL = await getOptionValue('FRONTEND_URL')

    /**
     * Start Facebook authentication
     */
    passport.use(
      new FacebookStrategy(
        {
          clientID: FACEBOOK_PROVIDER_CLIENT_ID,
          clientSecret: FACEBOOK_PROVIDER_CLIENT_SECRET,
          callbackURL: APP_URI + '/users/auth/facebook/callback',
          profileFields: ['email', 'first_name', 'last_name'],
          passReqToCallback: true
        },
        async function (req, accessToken, refreshToken, profile, done) {
          try {
            var result = await User.customFindOrCreate(
              {
                email: profile._json.email,
                firstName: profile._json.first_name,
                lastName: profile._json.last_name,
                provider: 'facebook'
              },
              false,
              req
            )

            done(null, { userData: result.user, token: result.token })
          } catch (e) {
            return done(e)
          }
        }
      )
    )

    passport.authenticate('facebook', {
      session: false,
      failureRedirect: FRONTEND_URL + '/login'
    })(req, res, next)
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { facebookAuthCallback }

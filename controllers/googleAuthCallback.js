var User = require(process.env.DB_TYPE === 'mongodb'
  ? '../models/mongodb/user'
  : '../models/sql/user')

var passport = require('passport')
var GoogleStrategy = require('passport-google-oauth20').Strategy
var { getOptionValue } = require('../helpers')

var googleAuthCallback = async (req, res, next) => {
  try {
    const GOOGLE_PROVIDER_CLIENT_ID = await getOptionValue(
      'GOOGLE_PROVIDER_CLIENT_ID'
    )
    const GOOGLE_PROVIDER_CLIENT_SECRET = await getOptionValue(
      'GOOGLE_PROVIDER_CLIENT_SECRET'
    )
    const APP_URI = await getOptionValue('APP_URI')

    const FRONTEND_URL = await getOptionValue('FRONTEND_URL')

    /**
     * Start Google authentication
     */

    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_PROVIDER_CLIENT_ID,
          clientSecret: GOOGLE_PROVIDER_CLIENT_SECRET,
          callbackURL: APP_URI + '/users/auth/google/callback',
          passReqToCallback: true
        },
        async function (req, accessToken, refreshToken, profile, done) {
          try {
            var result = await User.customFindOrCreate(
              {
                email: profile.emails[0].value,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                provider: 'google'
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

    /**
 * Some other scopes:
 * ['https://www.googleapis.com/auth/plus.login',
  'https://www.googleapis.com/auth/user.birthday.read',
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  'https://www.googleapis.com/auth/plus.me',
  'https://www.googleapis.com/auth/plus.profile.emails.read']
 */

    passport.authenticate('google', {
      session: false,
      failureRedirect: FRONTEND_URL + '/login'
    })(req, res, next)
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { googleAuthCallback }

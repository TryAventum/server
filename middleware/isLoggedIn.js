var User = require(process.env.DB_TYPE === 'mongodb' ? '../../models/mongodb/user' : '../../models/sql/user')

var isLoggedIn = async (req, res, next) => {
  try {
    var token = req.header('x-access-token')

    if (!token) {
      req.isLoggedIn = false
      next()
      return
    }

    var user = await User.findByToken(token)
    if (!user) {
      req.isLoggedIn = false
      next()
      return
    }

    req.isLoggedIn = true
    req.user = user
    req.token = token
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { isLoggedIn }

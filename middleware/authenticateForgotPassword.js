var User = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/user' : '../models/sql/user')

var authenticateForgotPassword = (req, res, next) => {
  var token = req.header('x-access-token')

  User.findByToken(token, 'forgotPassword').then((user) => {
    if (!user) {
      return res.status(401).send()
    }

    req.user = user
    req.token = token
    next()
  }).catch((e) => {
    res.status(401).send()
  })
}

module.exports = { authenticateForgotPassword }

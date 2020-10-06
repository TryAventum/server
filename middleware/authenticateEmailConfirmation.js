var User = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/user' : '../models/sql/user')

var authenticateEmailConfirmation = (req, res, next) => {
  var token = req.body.token

  User.findByToken(token, 'emailConfirmation').then((user) => {
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

module.exports = { authenticateEmailConfirmation }

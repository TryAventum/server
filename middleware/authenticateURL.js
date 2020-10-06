var User = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/user' : '../models/sql/user')

var authenticateURL = (req, res, next) => {
  var token = req.query.t

  User.findByToken(token).then((user) => {
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

module.exports = { authenticateURL }

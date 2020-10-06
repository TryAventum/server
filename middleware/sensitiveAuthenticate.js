var User = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/user' : '../models/sql/user')

// This middleware uses to confirm the user password as well
var sensitiveAuthenticate = (req, res, next) => {
  var token = req.header('x-access-token')

  User.findByToken(token).then((user) => {
    if (!user) {
      return res.status(401).send()
    }

    User.findByCredentials(user.email, req.body.password).then(user => {
      req.user = user
      req.token = token
      next()
    }).catch((e) => {
      res.status(401).send()
    })
  }).catch((e) => {
    res.status(401).send()
  })
}

module.exports = { sensitiveAuthenticate }

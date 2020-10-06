var User = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/user' : '../models/sql/user')

var authenticateProviderLogin = (req, res, next) => {
  var token = req.header('x-access-token')
  var provider = req.params.provider

  User.findByToken(token, `${provider}Provider`).then((user) => {
    if (!user) {
      return res.status(401).send()
    }

    User.removeToken(user.id, token).then(() => { }).catch(e => console.log(e))

    req.user = user
    next()
  }).catch((e) => {
    res.status(401).send()
  })
}

module.exports = { authenticateProviderLogin }

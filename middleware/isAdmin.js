const { ACL } = require('../packages/acl/acl.js')

var isAdmin = (req, res, next) => {
  if (ACL.isUserCanBe(req.user, ['admin'])) {
    next()
  } else {
    res.status(403).send()
  }
}

module.exports = { isAdmin }

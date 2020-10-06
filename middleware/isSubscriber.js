const { ACL } = require('../packages/acl/acl.js')

var isSubscriber = (req, res, next) => {
  if (ACL.isUserCanBe(req.user, ['subscriber'])) {
    next()
  } else {
    res.status(403).send()
  }
}

module.exports = { isSubscriber }

const { ACL } = require('../packages/acl/acl.js')

var isContributor = (req, res, next) => {
  if (ACL.isUserCanBe(req.user, ['contributor'])) {
    next()
  } else {
    res.status(403).send()
  }
}

module.exports = { isContributor }

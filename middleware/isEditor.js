const { ACL } = require('../packages/acl/acl.js')

var isEditor = (req, res, next) => {
  if (ACL.isUserCanBe(req.user, ['editor'])) {
    next()
  } else {
    res.status(403).send()
  }
}

module.exports = { isEditor }

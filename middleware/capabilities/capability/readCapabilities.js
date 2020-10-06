const { ACL } = require('../../../packages/acl/acl.js')

var readCapabilities = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readCapabilities'])
    if (theCheck) {
      next()
    } else {
      res.status(403).send()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { readCapabilities }

const { ACL } = require('../../../packages/acl/acl.js')

var readOthersSchemas = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersSchemas'])
    if (theCheck) {
      next()
    } else {
      res.status(403).send()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { readOthersSchemas }

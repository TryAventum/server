const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersSchemas = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersSchemas'])
    if (theCheck) {
      req.readOthersSchemas = true
    } else {
      req.readOthersSchemas = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersSchemas }

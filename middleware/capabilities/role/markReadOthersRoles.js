const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersRoles = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersRoles'])
    if (theCheck) {
      req.readOthersRoles = true
    } else {
      req.readOthersRoles = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersRoles }

const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersRole = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersRole'])
    if (theCheck) {
      req.readOthersRole = true
    } else {
      req.readOthersRole = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersRole }

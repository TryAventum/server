const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersCapability = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersCapability'])
    if (theCheck) {
      req.readOthersCapability = true
    } else {
      req.readOthersCapability = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersCapability }

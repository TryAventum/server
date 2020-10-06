const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersCapabilities = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersCapabilities'])
    if (theCheck) {
      req.readOthersCapabilities = true
    } else {
      req.readOthersCapabilities = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersCapabilities }

const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersCustomField = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersCustomField'])
    if (theCheck) {
      req.readOthersCustomField = true
    } else {
      req.readOthersCustomField = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersCustomField }

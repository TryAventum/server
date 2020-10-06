const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersCustomFields = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersCustomFields'])
    if (theCheck) {
      req.readOthersCustomFields = true
    } else {
      req.readOthersCustomFields = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersCustomFields }

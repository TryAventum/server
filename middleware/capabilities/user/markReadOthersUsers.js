const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersUsers = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersUsers'])
    if (theCheck) {
      req.readOthersUsers = true
    } else {
      req.readOthersUsers = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersUsers }

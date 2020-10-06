const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersUser = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersUser'])
    if (theCheck) {
      req.readOthersUser = true
    } else {
      req.readOthersUser = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersUser }

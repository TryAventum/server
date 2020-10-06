const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersUpload = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersUpload'])
    if (theCheck) {
      req.readOthersUpload = true
    } else {
      req.readOthersUpload = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersUpload }

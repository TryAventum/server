const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersUploads = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersUploads'])
    if (theCheck) {
      req.readOthersUploads = true
    } else {
      req.readOthersUploads = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersUploads }

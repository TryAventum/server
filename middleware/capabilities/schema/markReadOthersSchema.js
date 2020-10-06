const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersSchema = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersSchema'])
    if (theCheck) {
      req.readOthersSchema = true
    } else {
      req.readOthersSchema = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersSchema }

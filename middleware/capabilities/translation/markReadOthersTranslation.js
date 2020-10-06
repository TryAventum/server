const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersTranslation = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersTranslation'])
    if (theCheck) {
      req.readOthersTranslation = true
    } else {
      req.readOthersTranslation = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersTranslation }

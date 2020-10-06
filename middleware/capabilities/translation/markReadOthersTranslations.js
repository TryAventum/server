const { ACL } = require('../../../packages/acl/acl.js')

var markReadOthersTranslations = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersTranslations'])
    if (theCheck) {
      req.readOthersTranslations = true
    } else {
      req.readOthersTranslations = false
    }
    next()
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { markReadOthersTranslations }

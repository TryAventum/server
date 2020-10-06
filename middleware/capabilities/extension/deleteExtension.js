const { ACL } = require('../../../packages/acl/acl.js')

var deleteExtension = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['deleteExtension'])
    if (theCheck) {
      next()
    } else {
      res.status(403).send()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { deleteExtension }

const { ACL } = require('../../../packages/acl/acl.js')

var readOthersRole = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['readOthersRole'])
    if (theCheck) {
      next()
    } else {
      res.status(403).send()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { readOthersRole }

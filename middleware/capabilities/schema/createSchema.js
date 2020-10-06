const { ACL } = require('../../../packages/acl/acl.js')

var createSchema = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['createSchema'])
    if (theCheck) {
      next()
    } else {
      res.status(403).send()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { createSchema }

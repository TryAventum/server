const { ACL } = require('../../../packages/acl/acl.js')
var User = require(process.env.DB_TYPE === 'mongodb' ? '../../../models/mongodb/user' : '../../../models/sql/user')

var mustDeleteOthersUser = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['deleteOthersUser'])
    if (theCheck) {
      next()
    } else {
      var user = await User.customGetUser(req.params.id, req.user)
      if (user === 403) {
        return res.status(403).send()
      }
      if (user === null) {
        return res.status(404).send()
      }
      next()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { mustDeleteOthersUser }

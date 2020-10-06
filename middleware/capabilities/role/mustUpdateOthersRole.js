const { ACL } = require('../../../packages/acl/acl.js')
var Role = require(process.env.DB_TYPE === 'mongodb' ? '../../../models/mongodb/role' : '../../../models/sql/role')

var mustUpdateOthersRole = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['updateOthersRole'])
    if (theCheck) {
      next()
    } else {
      var role = await Role.getRole(req.params.id, req.user)
      if (role === 403) {
        return res.status(403).send()
      }
      if (role === null) {
        return res.status(404).send()
      }
      next()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { mustUpdateOthersRole }

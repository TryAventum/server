const { ACL } = require('../../../packages/acl/acl.js')
var Capability = require(process.env.DB_TYPE === 'mongodb' ? '../../../models/mongodb/capability' : '../../../models/sql/capability')

var mustUpdateOthersCapability = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['updateOthersCapability'])
    if (theCheck) {
      next()
    } else {
      var capability = await Capability.getCapability(req.params.id, req.user)
      if (capability === 403) {
        return res.status(403).send()
      }
      if (capability === null) {
        return res.status(404).send()
      }
      next()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { mustUpdateOthersCapability }

const { ACL } = require('../../../packages/acl/acl.js')
var Field = require(process.env.DB_TYPE === 'mongodb' ? '../../../models/mongodb/field' : '../../../models/sql/field')

var mustDeleteOthersCustomField = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['deleteOthersCustomField'])
    if (theCheck) {
      next()
    } else {
      var field = await Field.getField(req.params.id, req.user)
      if (field === 403) {
        return res.status(403).send()
      }
      if (field === null) {
        return res.status(404).send()
      }
      next()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { mustDeleteOthersCustomField }

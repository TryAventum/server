const { ACL } = require('../../../packages/acl/acl.js')
var Schema = require(process.env.DB_TYPE === 'mongodb' ? '../../../models/mongodb/schema' : '../../../models/sql/schema')

var mustDeleteOthersSchema = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['deleteOthersSchema'])
    if (theCheck) {
      next()
    } else {
      var schema = await Schema.getSchema(req.params.id, req.user)
      if (schema === 403) {
        return res.status(403).send()
      }
      if (schema === null) {
        return res.status(404).send()
      }
      next()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { mustDeleteOthersSchema }

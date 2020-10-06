const { ACL } = require('../../../packages/acl/acl.js')
var Upload = require(process.env.DB_TYPE === 'mongodb' ? '../../../models/mongodb/upload' : '../../../models/sql/upload')

var mustDeleteOthersUpload = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['deleteOthersUpload'])
    if (theCheck) {
      next()
    } else {
      var upload = await Upload.getUpload(req.params.id, req.user)
      if (upload === 403) {
        return res.status(403).send()
      }
      if (upload === null) {
        return res.status(404).send()
      }
      next()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { mustDeleteOthersUpload }

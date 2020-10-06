const { ACL } = require('../../../packages/acl/acl.js')
var Translation = require(process.env.DB_TYPE === 'mongodb' ? '../../../models/mongodb/translation' : '../../../models/sql/translation')

var mustDeleteOthersTranslation = async (req, res, next) => {
  try {
    const theCheck = await ACL.isUserCan(req.user, ['deleteOthersTranslation'])
    if (theCheck) {
      next()
    } else {
      var translation = await Translation.getTranslation(
        req.params.id,
        req.user
      )
      if (translation === 403) {
        return res.status(403).send()
      }
      if (translation === null) {
        return res.status(404).send()
      }
      next()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { mustDeleteOthersTranslation }

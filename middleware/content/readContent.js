const { ACL } = require('../../packages/acl/acl.js')
var { getModal } = require('../../helpers')
var User = require(process.env.DB_TYPE === 'mongodb' ? '../../models/mongodb/user' : '../../models/sql/user')

var readContent = async (req, res, next) => {
  try {
    const { model, schema } = await getModal(req.params.content)

    req.model = model
    req.schema = schema

    // In case no settings at all
    if (
      !schema.schemaDetails.acl
    ) {
      next()
      return
    }

    const alcSettings = schema.schemaDetails.acl.read
    
    // In case no restrictions at all
    if (
      !alcSettings.enable
    ) {
      next()
      return
    }

      var token = req.header('x-access-token')

      if (!token) {
        return res.status(401).send()
      }

      var user = await User.findByToken(token)
      if (!user) {
        return res.status(401).send()
      }

      req.user = user
      req.token = token
    
    var theCheck = await ACL.canReadContent(
      {req,
      skipNoRestrictionsCheck: true,
      model,
      schema}
    )

    if (theCheck.access) {
      req.returnedDataRestriction = theCheck.returnedDataRestriction
      next()
    } else {
      res.status(403).send()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { readContent }

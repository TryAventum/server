var Capability = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/capability' : '../models/sql/capability')

var reservedCapabilities = async (req, res, next) => {
  try {
    var capability = await Capability.getCapability(req.params.id, req.user)
    if (!capability) {
      return res.status(404).send()
    }

    if (capability.reserved && req.method === 'DELETE') {
      return res.status(403).send()
    }

    if (capability.reserved && req.method === 'PATCH' && req.body.name !== capability.name) {
      return res.status(403).send()
    }

    next()
  } catch (error) {
    res.status(401).send()
  }
}

module.exports = { reservedCapabilities }

var Role = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/role' : '../models/sql/role')

var reservedRoles = async (req, res, next) => {
  try {
    var role = await Role.getRole(req.params.id, req.user)
    if (!role) {
      return res.status(404).send()
    }

    if (role.reserved && req.method === 'DELETE') {
      return res.status(403).send()
    }

    if (role.reserved && req.method === 'PATCH' && req.body.name !== role.name) {
      return res.status(403).send()
    }

    next()
  } catch (error) {
    res.status(401).send()
  }
}

module.exports = { reservedRoles }

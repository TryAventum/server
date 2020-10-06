const Model = require('./lib/Model')
const Capability = require('./capability')
const RoleCapability = require('./roleCapability')

class Role extends Model {
  constructor(values = null) {
    super('roles')
    this.modelConfig.values = values
  }

  static async bulkInsertRows(rows) {
    const Role = this

    const insertedRows = await Role.create(rows)

    return insertedRows
  }

  static async createRole(values) {
    const Role = this
    try {
      const roleCapabilities = values.capabilities
      delete values.capabilities

      const role = await Role.create(values)

      if (roleCapabilities) {
        await role.set({
          values: roleCapabilities,
          sourceFieldName: 'roleId',
          targetFieldName: 'capabilityId',
          table: 'roleCapability',
        })
      }

      return role
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async getDefaultRole() {
    const Role = this
    var { getOptionValue } = require('../../helpers')

    const defaultRoleName = await getOptionValue('DEFAULT_ROLE')

    let defaultRole = await Role.findRow({
      name: defaultRoleName,
    })

    defaultRole = await this.setRelations([defaultRole])

    return defaultRole[0]
  }

  static async setUpRoles(rolesCapabilities, capabilitiesDocuments) {
    try {
      const Role = this

      const rolesObjects = Object.keys(rolesCapabilities).map((r) => ({
        name: r,
        label: r,
        reserved: true,
      }))

      const insertedRoles = await Role.create(rolesObjects)

      for (const role of insertedRoles) {
        const roleCapabilities = rolesCapabilities[role.name].map((c) => {
          return capabilitiesDocuments.find((e) => e.name === c)
        })

        await role.set({
          values: roleCapabilities.map((ll) => ll.id),
          sourceFieldName: 'roleId',
          targetFieldName: 'capabilityId',
          table: 'roleCapability',
        }) // Add records to roleCapabilities table
      }

      return insertedRoles
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async setRelations(roles) {
    try {
      // Get all capabilities
      const allCapabilities = await Capability.getAllCapabilities()
      // Get all roleCapability records
      const allRoleCapability = await RoleCapability.getAll()

      // Add to each role a "capabilities" property that contain array of capabilities objects
      // of that role
      roles = roles.map((role) => {
        const roleCapabilitiesIds = allRoleCapability
          .filter((rc) => rc.roleId === role.id)
          .map((o) => o.capabilityId)

        role.capabilities = allCapabilities.filter((c) =>
          roleCapabilitiesIds.includes(c.id)
        )

        return role
      })

      return roles
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async getRole(id, user = null) {
    var Role = this

    var cacheKey = `roles:g:${id}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        var { getStringID } = require('../../std-helpers')

        var role = await Role.findRow({
          id,
        })

        if (!role) {
          return null
        }

        if (user && getStringID(user.id) !== getStringID(role.createdBy)) {
          return 403
        }

        role = await this.setRelations([role])

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, role[0])

        return role[0]
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async updateRole(options) {
    try {
      const Role = this

      const roleCapabilities = options.values.capabilities
      delete options.values.capabilities

      const role = await Role.updateOne({
        where: { id: options.id },
        values: options.values,
      })

      if (roleCapabilities) {
        await role.set({
          values: roleCapabilities,
          sourceFieldName: 'roleId',
          targetFieldName: 'capabilityId',
          table: 'roleCapability',
        })
      }

      return role
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async deleteById(id) {
    if (!id) {
      return null
    }

    var Role = this

    try {
      const role = await Role.del({ id })

      return role
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async getAllRoles(req = null, user = null) {
    var Role = this

    var cacheKey
    if (user) {
      cacheKey = `roles:p:all:${user.id}`
    } else {
      cacheKey = 'roles:p:all'
    }

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        const query = {}
        query.where = {}

        if (user) {
          query.where.createdBy = user.id
        }

        var roles = await Role.find(query)

        roles = await this.setRelations(roles)

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, roles)

        return roles
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }
}

module.exports = Role

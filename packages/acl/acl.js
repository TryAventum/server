var Role = require(process.env.DB_TYPE === 'mongodb' ? '../../models/mongodb/role' : '../../models/sql/role')

var { getModal } = require('../../helpers')

class AccessControlList {
  /**
   * Check weather the user have these roles.
   *
   * @user {object} user user.roles is an array of roles ids, e.g. [1,2]
   * @roles {array} roles array or roles names or ids if ids option is true,
   * e.g. ['admin', 'super'] or [1,2]
   * @ids {bool} if true then we pass array of roles ids
   */
  async isUser (user, roles = [], ids = false, relationship = 'EVERY') {
    var { getStringID } = require('../../std-helpers')

    if (ids) {
      if (relationship === 'EVERY') {
        return roles
          .map(j => getStringID(j))
          .every(r => user.roles.map(i => getStringID(i)).includes(r))
      } else {
        return roles
          .map(j => getStringID(j))
          .some(r => user.roles.map(i => getStringID(i)).includes(r))
      }
    } else {
      const userRolesNames = await this.rolesIDsToNames(user.roles)

      if (relationship === 'EVERY') {
        return roles.every(r => userRolesNames.includes(r))
      } else {
        return roles.some(r => userRolesNames.includes(r))
      }
    }
  }

  /**
   * Check weather the user have these capabilities.
   *
   * @param {object} user user.roles is an array of capabilities ids, e.g. [1,2]
   * @param {array} capabilities array or roles names or ids if ids option is true,
   * e.g. ['manageAdmins', 'manageOthersPosts'] or [1,2]
   * @ids {bool} if true then we pass array of capabilities ids
   */
  async isUserCan (
    user,
    capabilities = [],
    ids = false,
    relationship = 'EVERY'
  ) {
    if (ids) {
      var { getStringID } = require('../../std-helpers')
      const userCapabilities = await this.getUserCapabilities(user, true)

      if (relationship === 'EVERY') {
        return capabilities
          .map(c => getStringID(c))
          .every(c => userCapabilities.map(i => getStringID(i)).includes(c))
      } else {
        return capabilities
          .map(c => getStringID(c))
          .some(c => userCapabilities.map(i => getStringID(i)).includes(c))
      }
    } else {
      const userCapabilities = await this.getUserCapabilities(user)

      if (relationship === 'EVERY') {
        return capabilities.every(c => userCapabilities.includes(c))
      } else {
        return capabilities.some(c => userCapabilities.includes(c))
      }
    }
  }

  /**
   * roles is array of ids
   * return array of capabilities objects
   */
  async getRolesCapabilities (roles) {
    var { getStringID } = require('../../std-helpers')
    // Make sure the roles is strings
    roles = roles.map(r => getStringID(r))

    const allRoles = await Role.getAllRoles()

    return allRoles
      .filter(r => roles.includes(getStringID(r.id)))
      .reduce(
        (accumulator, currentValue) => [
          ...accumulator,
          ...currentValue.capabilities
        ],
        []
      )
  }

  async getBoolValue (field, user, obj) {
    if (typeof field === 'boolean') {
      return field
    }

    var result

    switch (field.type) {
      default:
      case 'auth':
        return !!(user && user.id)

      case 'owner':
        // eslint-disable-next-line eqeqeq
        return !!(user && user.id && obj.createdBy == user.id)

      case 'haveAnyRoles':
        result = await this.isUser(
          user,
          field.value,
          true,
          'SOME'
        )

        return result
      case 'haveAllRoles':
        result = await this.isUser(
          user,
          field.value,
          true,
          'EVERY'
        )
        return result
      case 'haveAllCaps':
        result = await this.isUserCan(
          user,
          field.value,
          true,
          'EVERY'
        )
        return result
      case 'haveAnyCap':
        result = await this.isUserCan(
          user,
          field.value,
          true,
          'SOME'
        )
        return result
    }
  }

  async getRowVal (fields, user, obj) {
    let returnedDataRestriction
    const init = { usedIndexes: [], value: null }
    for (const [index, curr] of fields.entries()) {
      if (!init.usedIndexes.includes(index)) {
        if (typeof curr === 'boolean') {
          init.value = curr
          continue
        }

        if (curr.type === 'relation') {
          const nextItem = fields[index + 1]
          init.usedIndexes.push(index + 1)

          if (['allData', 'ownedData'].includes(nextItem.type)) {
            returnedDataRestriction = nextItem.type
          }

          let val
          if (curr.value === 'or') {
            val = init.value || await this.getBoolValue(nextItem, user, obj)
          } else {
            val = init.value && await this.getBoolValue(nextItem, user, obj)
          }
          init.value = val

          // return init
        } else {
          if (['allData', 'ownedData'].includes(curr.type)) {
            init.value = true
            returnedDataRestriction = curr.type
          } else {
            init.value = await this.getBoolValue(curr, user, obj)
          }
        }
      }
    }

    return { value: init.value, returnedDataRestriction }
  }

  async conditionBuilder (_data, { user }, obj) {
    let returnedDataRestriction = null
    // Should be something like [false, {type: 'relation', value: 'or'}, true]
    const newFields = []
    for (const field of _data.fields) {
      if (field.fields.length === 1 && field.fields[0].type === 'relation') {
        newFields.push(field.fields[0])
      } else {
        const rowVal = await this.getRowVal(field.fields, user, obj)
        returnedDataRestriction = rowVal.returnedDataRestriction && rowVal.value ? rowVal.returnedDataRestriction : returnedDataRestriction
        newFields.push(rowVal.value)
      }
    }

    const finalVal = await this.getRowVal(newFields, user, obj)
    return { value: finalVal.value, returnedDataRestriction }
  }

  async canReadContent (
    {
      req,
      content,
      skipNoRestrictionsCheck,
      model = null,
      schema = null
    }
  ) {
    try {
      if (!model || !schema) {
        const cns = await getModal(req.params.content || content)
        model = cns.model
        schema = cns.schema
      }

      // In case no settings at all
      if (
        !schema.schemaDetails.acl
      ) {
        return { access: true, model, schema }
      }

      const alcSettings = schema.schemaDetails.acl.read

      // In case no restrictions at all
      if (
        !skipNoRestrictionsCheck &&
        !alcSettings.enable
      ) {
        return { access: true, model, schema }
      }

      // If the user role is super or administrator then allow access
      // const adminSuperCheck = await this.isUser(
      //   user,
      //   ['super', 'administrator'],
      //   false,
      //   'SOME'
      // )

      // if (adminSuperCheck) {
      //   return { access: true, model, schema }
      // }

      const canRead = await this.conditionBuilder(alcSettings, req)

      if (canRead.value) {
        return { access: true, model, schema, returnedDataRestriction: canRead.returnedDataRestriction }
      }

      return { access: false, model, schema, returnedDataRestriction: canRead.returnedDataRestriction }
    } catch (e) {
      console.log(e)

      return null
    }
  }

  async canDeleteContent (
    req,
    skipNoRestrictionsCheck = false,
    model = null,
    schema = null
  ) {
    try {
      if (!model || !schema) {
        const cns = await getModal(req.params.content)
        model = cns.model
        schema = cns.schema
      }

      // In case no settings at all
      if (
        !schema.schemaDetails.acl
      ) {
        return { access: true, model, schema }
      }

      const alcSettings = schema.schemaDetails.acl.delete

      // In case no restrictions at all
      if (
        !skipNoRestrictionsCheck &&
        !alcSettings.enable
      ) {
        return { access: true, model, schema }
      }

      const obj = await model.getById(req)

      // If the user role is super or administrator then allow access
      // const adminSuperCheck = await this.isUser(
      //   user,
      //   ['super', 'administrator'],
      //   false,
      //   'SOME'
      // )
      // if (adminSuperCheck) {
      //   return { access: true, model, schema }
      // }

      const canDelete = await this.conditionBuilder(alcSettings, req, obj)

      if (canDelete.value) {
        return { access: true, model, schema }
      }

      return { access: false, model, schema }
    } catch (e) {
      return null
    }
  }

  async canCreateContent (
    req,
    skipNoRestrictionsCheck = false,
    model = null,
    schema = null
  ) {
    try {
      if (!model || !schema) {
        const cns = await getModal(req.params.content)
        model = cns.model
        schema = cns.schema
      }

      // In case no settings at all
      if (
        !schema.schemaDetails.acl
      ) {
        return { access: true, model, schema }
      }

      const alcSettings = schema.schemaDetails.acl.create

      // In case no restrictions at all
      if (
        !skipNoRestrictionsCheck &&
        !alcSettings.enable
      ) {
        return { access: true, model, schema }
      }

      // If the user role is super or administrator then allow access
      // const adminSuperCheck = await this.isUser(
      //   user,
      //   ['super', 'administrator'],
      //   false,
      //   'SOME'
      // )
      // if (adminSuperCheck) {
      //   return { access: true, model, schema }
      // }

      const canCreate = await this.conditionBuilder(alcSettings, req)

      if (canCreate.value) {
        return { access: true, model, schema }
      }

      return { access: false, model, schema }
    } catch (e) {
      return null
    }
  }

  async canUpdateContent (
    req,
    skipNoRestrictionsCheck = false,
    model = null,
    schema = null
  ) {
    try {
      if (!model || !schema) {
        const cns = await getModal(req.params.content)
        model = cns.model
        schema = cns.schema
      }

      // In case no settings at all
      if (
        !schema.schemaDetails.acl
      ) {
        return { access: true, model, schema }
      }

      const alcSettings = schema.schemaDetails.acl.update

      // In case no restrictions at all
      if (
        !skipNoRestrictionsCheck &&
        !alcSettings.enable
      ) {
        return { access: true, model, schema }
      }

      const obj = await model.getById(req)

      // If the user role is super or administrator then allow access
      // const adminSuperCheck = await this.isUser(
      //   user,
      //   ['super', 'administrator'],
      //   false,
      //   'SOME'
      // )
      // if (adminSuperCheck) {
      //   return { access: true, model, schema }
      // }

      const canUpdate = await this.conditionBuilder(alcSettings, req, obj)

      if (canUpdate.value) {
        return { access: true, model, schema }
      }

      return { access: false, model, schema }
    } catch (e) {
      return null
    }
  }

  async getUserCapabilities (user, ids = false) {
    var { getStringID } = require('../../std-helpers')
    let rolesCapabilities = await this.getRolesCapabilities(user.roles)

    rolesCapabilities = rolesCapabilities.map(c => getStringID(c.id))

    let allUserCapabilities = [...user.capabilities, ...rolesCapabilities]

    if (!ids) {
      allUserCapabilities = await this.capabilitiesIDsToNames(
        allUserCapabilities
      )
    }

    return allUserCapabilities
  }

  async capabilitiesIDsToNames (capabilitiesIds) {
    var { getStringID } = require('../../std-helpers')
    const allRoles = await Role.getAllRoles()

    const allCapabilities = allRoles.reduce(
      (accumulator, currentValue) => [
        ...accumulator,
        ...currentValue.capabilities
      ],
      []
    )

    return allCapabilities
      .filter(c => capabilitiesIds.includes(getStringID(c.id)))
      .map(r => r.name)
  }

  async rolesIDsToNames (rolesIds) {
    var { getStringID } = require('../../std-helpers')
    const allRoles = await Role.getAllRoles()

    const rolesNames = allRoles
      .filter(r => rolesIds.includes(getStringID(r.id)))
      .map(r => r.name)

    return rolesNames
  }

  async rolesNamesToIDs (rolesNames) {
    const allRoles = await Role.getAllRoles()

    const rolesIDs = allRoles
      .filter(r => rolesNames.includes(r.name))
      .map(r => r.id)

    return rolesIDs
  }
}

var ACL = new AccessControlList()

module.exports = { ACL }

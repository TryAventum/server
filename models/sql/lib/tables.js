module.exports = async () => {
  let exists

  /// ////////////////users/////////////////
  exists = await aventum.knex.schema.hasTable('users')
  if (!exists) {
    await aventum.knex.schema.createTable('users', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table.string('firstName', 100).notNullable()
      table.string('lastName', 100).notNullable()
      table
        .string('email', 100)
        .unique()
        .notNullable()
      table
        .boolean('emailConfirmation')
        .notNullable()
        .defaultTo(false)
      table.string('password', 255).notNullable()
      table.string('picture', 250)
      table.string('gender', 10)
      table.string('provider', 15)
      table.datetime('birthday', { precision: 6 })
      table.bigInteger('createdBy').unsigned()
      table.bigInteger('updatedBy').unsigned()
      table.datetime('createdAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))
      table.datetime('updatedAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))

      table.foreign('createdBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
      table.foreign('updatedBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
    })
  }
  /// ////////////////roles/////////////////
  exists = await aventum.knex.schema.hasTable('roles')
  if (!exists) {
    await aventum.knex.schema.createTable('roles', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table
        .string('name', 191)
        .notNullable()
        .unique()
      table.string('label', 150)
      table
        .boolean('reserved')
        .notNullable()
        .defaultTo(false)
      table.bigInteger('createdBy').unsigned()
      table.bigInteger('updatedBy').unsigned()
      table.datetime('createdAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))
      table.datetime('updatedAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))

      table.foreign('createdBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
      table.foreign('updatedBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
    })
  }
  /// ////////////////uploads/////////////////
  exists = await aventum.knex.schema.hasTable('uploads')
  if (!exists) {
    await aventum.knex.schema.createTable('uploads', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table.string('path', 1300).notNullable()
      table.string('originalName', 100).notNullable()
      table.bigInteger('createdBy').unsigned()
      table.bigInteger('updatedBy').unsigned()
      table.datetime('createdAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))
      table.datetime('updatedAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))

      table.foreign('createdBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
      table.foreign('updatedBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
    })
  }
  /// ////////////////capabilities/////////////////
  exists = await aventum.knex.schema.hasTable('capabilities')
  if (!exists) {
    await aventum.knex.schema.createTable('capabilities', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table
        .string('name', 100)
        .notNullable()
        .unique()
      table.string('label', 150).notNullable()
      table
        .boolean('reserved')
        .notNullable()
        .defaultTo(false)
      table.bigInteger('createdBy').unsigned()
      table.bigInteger('updatedBy').unsigned()
      table.datetime('createdAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))
      table.datetime('updatedAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))

      table.foreign('createdBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
      table.foreign('updatedBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
    })
  }
  /// ////////////////schemas/////////////////
  exists = await aventum.knex.schema.hasTable('schemas')
  if (!exists) {
    await aventum.knex.schema.createTable('schemas', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table
        .string('name', 191)
        .notNullable()
        .unique()
      table.string('title', 150).notNullable()
      table.string('singularTitle', 149).notNullable()
      table.text('icon')
      table.text('fields')
      table.text('acl')
      table.bigInteger('createdBy').unsigned()
      table.bigInteger('updatedBy').unsigned()
      table.datetime('createdAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))
      table.datetime('updatedAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))

      table.foreign('createdBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
      table.foreign('updatedBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
    })
  }
  /// ////////////////userRole/////////////////
  exists = await aventum.knex.schema.hasTable('userRole')
  if (!exists) {
    await aventum.knex.schema.createTable('userRole', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table.bigInteger('userId').unsigned()
      table.bigInteger('roleId').unsigned()

      table.foreign('userId').references('users.id').onUpdate('CASCADE').onDelete('CASCADE')
      table.foreign('roleId').references('roles.id').onUpdate('CASCADE').onDelete('CASCADE')
    })
  }
  /// ////////////////userCapability/////////////////
  exists = await aventum.knex.schema.hasTable('userCapability')
  if (!exists) {
    await aventum.knex.schema.createTable('userCapability', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table.bigInteger('userId').unsigned()
      table.bigInteger('capabilityId').unsigned()

      table.foreign('userId').references('users.id').onUpdate('CASCADE').onDelete('CASCADE')
      table.foreign('capabilityId').references('capabilities.id').onUpdate('CASCADE').onDelete('CASCADE')
    })
  }
  /// ////////////////translations/////////////////
  exists = await aventum.knex.schema.hasTable('translations')
  if (!exists) {
    await aventum.knex.schema.createTable('translations', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table
        .text('key')
        .notNullable()
        .unique()
      table.text('en')
      table.text('ar')
      table.integer('order').notNullable()
    })
  }
  /// ////////////////tokens/////////////////
  exists = await aventum.knex.schema.hasTable('tokens')
  if (!exists) {
    await aventum.knex.schema.createTable('tokens', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table.string('token', 2048).notNullable()
      table.string('access', 30).notNullable()
      table.string('ip')
      table.string('userAgent')
      table.bigInteger('userId').unsigned()
      table.datetime('createdAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))

      table.foreign('userId').references('users.id').onUpdate('CASCADE').onDelete('CASCADE')
    })
  }
  /// ////////////////roleCapability/////////////////
  exists = await aventum.knex.schema.hasTable('roleCapability')
  if (!exists) {
    await aventum.knex.schema.createTable('roleCapability', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table.bigInteger('roleId').unsigned()
      table.bigInteger('capabilityId').unsigned()

      table.foreign('roleId').references('roles.id').onUpdate('CASCADE').onDelete('CASCADE')
      table.foreign('capabilityId').references('capabilities.id').onUpdate('CASCADE').onDelete('CASCADE')
    })
  }
  /// ////////////////options/////////////////
  exists = await aventum.knex.schema.hasTable('options')
  if (!exists) {
    await aventum.knex.schema.createTable('options', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table
        .string('name', 191)
        .notNullable()
        .unique()
      table.text('value')
    })
  }
  /// ////////////////notifications/////////////////
  exists = await aventum.knex.schema.hasTable('notifications')
  if (!exists) {
    await aventum.knex.schema.createTable('notifications', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table.string('header', 100)
      table.string('type', 10).defaultTo('info')
      table.string('status', 10).defaultTo('unread')
      table.string('content', 1400).notNullable()
      table
        .boolean('touched')
        .notNullable()
        .defaultTo(false)
      table.bigInteger('userId').unsigned()
      table.datetime('createdAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))
      table.datetime('updatedAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))

      table.foreign('userId').references('users.id').onUpdate('CASCADE').onDelete('CASCADE')
    })
  }
  /// ////////////////fields/////////////////
  exists = await aventum.knex.schema.hasTable('fields')
  if (!exists) {
    await aventum.knex.schema.createTable('fields', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table
        .string('name', 150)
        .notNullable()
        .unique()
      table.string('title', 150).notNullable()
      table.string('singularTitle', 149).notNullable()
      table.text('fields')
      table.bigInteger('createdBy').unsigned()
      table.bigInteger('updatedBy').unsigned()
      table.datetime('createdAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))
      table.datetime('updatedAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))

      table.foreign('createdBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
      table.foreign('updatedBy').references('users.id').onUpdate('CASCADE').onDelete('SET NULL')
    })
  }
  /// ////////////////extensions/////////////////
  exists = await aventum.knex.schema.hasTable('extensions')
  if (!exists) {
    await aventum.knex.schema.createTable('extensions', function (table) {
      table
        .bigIncrements('id', 20)
        .primary()
        .unsigned()
      table
        .string('name', 512)
        .notNullable()
        .unique()
      table.datetime('createdAt', { precision: 6, useTz: true }).defaultTo(aventum.knex.fn.now(6))
    })
  }
}

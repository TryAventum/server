aventum.hooks.addAction(
  'schemaUpdated',
  'Aventum/Core/subscribers/schema',
  async (schema, req, res) => {
    aventum.cache.deleteKey(`contentSchema:g:${schema.name}`)
  }
)

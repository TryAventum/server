var filterSchemaData = (req, res, next) => {
  const fields = [
    'title',
    'singularTitle',
    'name',
    'icon',
    'acl',
    'fields'
  ]

  const filteredData = {}

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      if (field === 'name') {
        filteredData[field] = req.body[field].toLowerCase()
      } else if (field === 'fields') {
        filteredData[field] = JSON.stringify(req.body[field])
      } else if (field === 'acl') {
        filteredData[field] = JSON.stringify(req.body[field])
      } else {
        filteredData[field] = req.body[field]
      }
    }
  }

  req.body = filteredData
  next()
}

module.exports = { filterSchemaData }

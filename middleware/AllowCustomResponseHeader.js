var allowCustomResponseHeader = (req, res, next) => {
  res.setHeader('Access-Control-Expose-Headers', 'x-access-token')
  return next()
}

module.exports = {
  allowCustomResponseHeader
}

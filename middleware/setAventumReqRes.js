/**
 * Assign req & res to aventum global object.
 */
var setAventumReqRes = (req, res, next) => {
  aventum.req = req
  aventum.res = res
  next()
}

module.exports = { setAventumReqRes }

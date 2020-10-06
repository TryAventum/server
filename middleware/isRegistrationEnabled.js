var { getOptionValue } = require('../helpers')

var isRegistrationEnabled = async (req, res, next) => {
  try {
    const theCheck = await getOptionValue(
      'ENABLE_REGISTRATION'
    )
    if (theCheck) {
      next()
    } else {
      res.status(403).send()
    }
  } catch (e) {
    res.status(401).send()
  }
}

module.exports = { isRegistrationEnabled }

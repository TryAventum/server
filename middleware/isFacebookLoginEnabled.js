var { getOptionValue } = require('../helpers')

var isFacebookLoginEnabled = async (req, res, next) => {
  try {
    const theCheck = await getOptionValue(
      'ENABLE_FACEBOOK_LOGIN'
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

module.exports = { isFacebookLoginEnabled }

var Translation = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/translation' : '../models/sql/translation')

module.exports.getAll = async (req, res) => {
  try {
    var translations = await Translation.getAllTranslations()
    return res.send({ translations })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.put = async (req, res) => {
  try {
    const results = await Translation.updateTranslations(req)

    res.send(results)
  } catch (error) {
    res.status(400).send(error)
  }
}

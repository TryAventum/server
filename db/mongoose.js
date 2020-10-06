var mongoose = require('mongoose')

const mongooseConnection = () => {
  mongoose.Promise = global.Promise
  const target = process.env.DB_PASSWORD ? `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}` : `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`

  return mongoose.connect(target, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
}

module.exports = { mongooseConnection }

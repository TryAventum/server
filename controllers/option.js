var path = require('path')
var Option = require(process.env.DB_TYPE === 'mongodb' ? '../models/mongodb/option' : '../models/sql/option')
var randomize = require('randomatic')

module.exports.getAll = async (req, res) => {
  try {
    var options = await Option.getAllOptions()
    return res.send({ options })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getPublic = async (req, res) => {
  try {
    var options = await Option.getAllOptions()

    const publicOptions = [
      'BUSINESS_NAME',
      'ENABLE_FACEBOOK_LOGIN',
      'ENABLE_GOOGLE_LOGIN',
      'ENABLE_REGISTRATION',
      'DB_TYPE'
    ]

    options = options.filter(o => publicOptions.includes(o.name))

    return res.send({ options })
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.getFlushAllCache = (req, res) => {
  aventum.cache.flushAll().then(
    succ => {
      res.status(200).send()
    },
    err => {
      res.status(400).send(err)
    }
  )
}

module.exports.patch = async (req, res) => {
  try {
    var options = req.body.options

    for (var option of options) {
      await Option.updateOption(option)

      const cacheKey = `options:g:${option.name}`
      aventum.cache.deleteKey(cacheKey)
    }

    const cacheKey = 'options:p:all'
    aventum.cache.deleteKey(cacheKey)

    aventum.hooks.doActionSync('optionsUpdated', req, res)

    res.status(200).send()
  } catch (e) {
    res.status(400).send()
  }
}

module.exports.optionsSetup = async () => {
  // TODO setup only if not setup

  const defaultOptions = [
    { name: 'BUSINESS_NAME', value: process.env.BUSINESS_NAME || '' },
    { name: 'AVENTUM_VERSION', value: aventum.version },
    { name: 'JWT_SECRET', value: process.env.JWT_SECRET || randomize('*', 40) },
    { name: 'APP_URI', value: process.env.APP_URI || 'http://localhost:3030' },
    {
      name: 'FRONTEND_URL',
      value: process.env.FRONTEND_URL || 'http://localhost:3333'
    },
    {
      name: 'UPLOADS_PUBLIC_URL',
      value: process.env.UPLOADS_PUBLIC_URL || 'http://localhost:3030'
    },
    {
      name: 'UPLOADS_PUBLIC_PATH',
      value: process.env.UPLOADS_PUBLIC_PATH || 'content/public/uploads/'
    },
    {
      name: 'DASHBOARD_ABS_PATH',
      value: process.env.DASHBOARD_ABS_PATH || path.join(__dirname, '../../dashboard')
    },
    { name: 'SMTP_HOST', value: process.env.SMTP_HOST || '' },
    { name: 'SMTP_PORT', value: process.env.SMTP_PORT || 465 },
    { name: 'SMTP_SECURE', value: process.env.SMTP_SECURE || true },
    { name: 'SMTP_FROM_NAME', value: process.env.SMTP_FROM_NAME || '' },
    { name: 'SMTP_FROM_EMAIL', value: process.env.SMTP_FROM_EMAIL || '' },
    { name: 'SMTP_REPLYTO_EMAIL', value: process.env.SMTP_REPLYTO_EMAIL || '' },
    { name: 'SMTP_AUTH_USERNAME', value: process.env.SMTP_AUTH_USERNAME || '' },
    { name: 'SMTP_AUTH_PASSWORD', value: process.env.SMTP_AUTH_PASSWORD || '' },
    {
      name: 'ENABLE_FACEBOOK_LOGIN',
      value: process.env.ENABLE_FACEBOOK_LOGIN || false
    },
    {
      name: 'ENABLE_REGISTRATION',
      value: process.env.ENABLE_REGISTRATION || false
    },
    {
      name: 'FACEBOOK_PROVIDER_CLIENT_ID',
      value: process.env.FACEBOOK_PROVIDER_CLIENT_ID || ''
    },
    {
      name: 'FACEBOOK_PROVIDER_CLIENT_SECRET',
      value: process.env.FACEBOOK_PROVIDER_CLIENT_SECRET || ''
    },
    {
      name: 'ENABLE_GOOGLE_LOGIN',
      value: process.env.ENABLE_GOOGLE_LOGIN || false
    },
    {
      name: 'GOOGLE_PROVIDER_CLIENT_ID',
      value: process.env.GOOGLE_PROVIDER_CLIENT_ID || ''
    },
    {
      name: 'GOOGLE_PROVIDER_CLIENT_SECRET',
      value: process.env.GOOGLE_PROVIDER_CLIENT_SECRET || ''
    },
    { name: 'DEFAULT_ROLE', value: process.env.DEFAULT_ROLE || 'subscriber' }
  ]

  aventum.cache.batchDeletionKeysByPattern('options:p:*')

  const optionsRows = await Option.bulkInsertRows(defaultOptions)

  return optionsRows
}

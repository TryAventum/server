global.aventum = {}

aventum.db = {}
aventum.version = require('./package.json').version

aventum.dir = __dirname

var fse = require('fs-extra')
const express = require('express')
var helmet = require('helmet')
const cors = require('cors')
var Redis = require('ioredis')
const bodyParser = require('body-parser')
var i18next = require('i18next')
const path = require('path')
const join = path.join

const i18nextMiddleware = require('i18next-express-middleware')
const i18nextBackend = require('i18next-node-fs-backend')

require('dotenv-flow').config()

aventum.db.type = process.env.DB_TYPE

i18next
  .use(i18nextBackend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    backend: {
      loadPath: join(__dirname, '/locales/{{lng}}/{{ns}}.json'),
      addPath: join(__dirname, '/locales/{{lng}}/{{ns}}.missing.json'),
    },
    fallbackLng: 'en',
    preload: ['en', 'ar'],
    saveMissing: true,
  })

// i18next.use(i18nextMiddleware.LanguageDetector).init({
//   preload: ['en', 'ar']
// })

var { enUS } = require('date-fns/locale')
// Default locale
global.dateLocale = enUS

i18next.on('languageChanged', function (lng) {
  if (lng === 'ar') {
    var { arSA } = require('date-fns/locale')
    global.dateLocale = arSA
  } else {
    global.dateLocale = enUS
  }
})

aventum.i18n = i18next

require('./prototype-extension.js')
var { requireUncached, clearAppRequireCache } = require('./std-helpers')
const { getAllExtensions } = require('./extensions-helpers')

var redis = new Redis({
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST,
  family: process.env.REDIS_FAMILY,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB,
})
global.redis = redis

var AventumCache = require('./packages/cache')
aventum.cache = AventumCache

// Setup the hooks system
var AventumHooks = require('@aventum/hooks')
const setUpHooksSystem = () => {
  aventum.hooks = AventumHooks.createHooks()
}

var mongoose

// Connect to the database
async function connectToDB() {
  try {
    if (process.env.DB_TYPE === 'mongodb') {
      var { mongooseConnection } = require('./db/mongoose')

      // Wait for the connection to complete
      await mongooseConnection()
      mongoose = require('mongoose')
    } else {
      var knex = require('knex')({
        client: process.env.DB_TYPE,
        // debug: true,
        connection: {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
        },
      })

      aventum.knex = knex

      const createTables = require('./models/sql/lib/tables')
      await createTables()
    }
  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

async function main() {
  try {
    aventum.hooks.addAction(
      'extensionActivated',
      'Aventum/Core/Index/main',
      restart
    )
    aventum.hooks.addAction(
      'extensionDeactivated',
      'Aventum/Core/Index/main',
      restart
    )
    aventum.hooks.addAction(
      'extensionDeleted',
      'Aventum/Core/Index/main',
      async (extension, req, res, options) => {
        if (
          extension.aventum.active &&
          (!extension.aventum.target || extension.aventum.target === 'server')
        ) {
          await restart(extension, req, res, options)
        }
      }
    )
    aventum.hooks.addFilter(
      'sendPatchExtensionResponse',
      'Aventum/Core/Index/main',
      async (content, extension, req, res) => {
        if (extension.aventum.target === 'server') {
          return false
        } else {
          return content
        }
      }
    )

    aventum.hooks.addFilter(
      'sendExtensionNotExistResponse',
      'Aventum/Core/Index/main',
      async (content, extension, req, res, options) => {
        if (extension.aventum.target === 'server') {
          return false
        } else {
          return content
        }
      }
    )

    var app = express()

    var { setAventumReqRes } = require('./middleware/setAventumReqRes')
    app.use(setAventumReqRes)

    // Get the active server extensions
    var activeExtensions
    if (process.env.DB_TYPE === 'mongodb') {
      const { db } = mongoose.connection
      activeExtensions = await db.collection('extensions').find({}).toArray()
    } else {
      activeExtensions = await aventum.knex.select().table('extensions')
    }

    var extensions = await getAllExtensions(activeExtensions)

    // Load the active server extensions
    for (const extension of extensions) {
      if (extension.aventum.active && extension.aventum.target === 'server') {
        const extensionPath = `${aventum.dir}${extension.aventum.path.replace(
          'package.json',
          'index.js'
        )}`
        var exists = await fse.pathExists(extensionPath)
        if (exists) {
          requireUncached(extensionPath)
          const publicFolder = `${aventum.dir}${extension.aventum.path.replace(
            'package.json',
            'public'
          )}`
          var publicFolderExists = await fse.pathExists(publicFolder)
          if (publicFolderExists) {
            app.use(
              `/extensions/${extension.name}`,
              express.static(publicFolder)
            )
          }
        } else {
          // Extension is missing, deactivate it and notify the admins and supers
          aventum.hooks.addAction(
            'listen',
            'Aventum/Core/Index/main',
            async () => {
              const { extensionNotExist } = require('./extensions-helpers')

              await extensionNotExist(null, null, { extension })
            }
          )
        }
      }
    }

    /**
     * Upgrade Aventum
     */
    /**
     * Check if there is update has to be made.
     */
    //Get version number from the database
    // Check if already update in progress(in case of cluster).
    let data
    if (process.env.DB_TYPE === 'mongodb') {
      const { db } = mongoose.connection
      data = await db
        .collection('options')
        .find({ name: { $in: ['version', 'updating'] } })
        .toArray()
    } else {
      data = await aventum
        .knex('options')
        .whereIn('name', ['version', 'updating'])
    }

    let versionInDB = data.find((i) => i.name === 'version')
    let isUpdating = data.find((i) => i.name === 'updating')
    if (versionInDB) {
      versionInDB = versionInDB.value
    }
    if (!isUpdating) {
      // Update Aventum
    }

    require('./subscribers/user.js')
    require('./subscribers/schema.js')
    require('./cache/schemas.js')

    var {
      allowCustomResponseHeader,
    } = require('./middleware/AllowCustomResponseHeader')

    var contentsRoutes = require('./routes/schemas')
    var fieldsRoutes = require('./routes/fields')
    var notificationsRoutes = require('./routes/notifications')
    var capabilitiesRoutes = require('./routes/capabilities')
    var rolesRoutes = require('./routes/roles')
    var translationsRoutes = require('./routes/translations')
    var extensionsRoutes = require('./routes/extensions')
    var contents = require('./routes/contents')
    var optionsRoutes = require('./routes/options')
    var usersRoutes = require('./routes/users')
    var uploadsRoutes = require('./routes/uploads')

    app.use(helmet())
    app.use(cors())
    app.use(allowCustomResponseHeader)
    app.use(i18nextMiddleware.handle(i18next))
    app.use(express.static('content/public'))

    const port = process.env.PORT

    app.use('/uploads', uploadsRoutes)
    app.use(bodyParser.json())

    app.use('/options', optionsRoutes)

    app.use('/schemas', contentsRoutes)
    app.use('/notifications', notificationsRoutes)
    app.use('/fields', fieldsRoutes)
    app.use('/exts', extensionsRoutes)
    app.use('/capabilities', capabilitiesRoutes)
    app.use('/roles', rolesRoutes)
    app.use('/translations', translationsRoutes)

    app.use('/users', usersRoutes)

    app.use('/', contents)

    global.server = app.listen(port, () => {
      aventum.hooks.doActionSync('listen', port, app)
      console.log(`Listening on port ${port}!`)
    })
  } catch (error) {
    console.log(error)
  }
}

const run = async () => {
  setUpHooksSystem()
  await connectToDB()
  main()
}

run()

const restart = async (extension, req, res, options) => {
  if (!extension.aventum.target || extension.aventum.target === 'server') {
    console.log('Restarting the server. . .')

    // Without clearing the cache of these files Node.js will not require them again, so the hooks will not run
    clearAppRequireCache()

    if (process.env.DB_TYPE === 'mongodb') {
      // Without this we will receive OverwriteModelError: Cannot overwrite <modelName> model once compiled.
      mongoose.deleteModel(/.+/) // Delete every model
    } else {
      // TODO probably we need something here for knex
    }

    setUpHooksSystem()
    server.close()
    await main()

    if (res) {
      res.send({ extension })
    }
    return { extension }
  }
}

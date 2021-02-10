const semver = require('semver')
var fs = require('fs')
const winston = require('winston')
var fse = require('fs-extra')
const util = require('util')
const path = require('path')
var mongoose = require('mongoose')
const readDir = util.promisify(fs.readdir)

const releaseLock = async (lockName) => {
  let result
  if (process.env.DB_TYPE === 'mongodb') {
    const { db } = mongoose.connection
    result = await db
      .collection('options')
      .deleteOne({ name: lockName + '.lock' })
  } else {
    result = await aventum
      .knex('options')
      .where(lockName + '.lock', 'true')
      .del()
  }

  return result
}

const createLock = async ({
  lockName,
  releaseTimeout = 3600000, // Default to 1 hour
  currentLock,
  logger,
}) => {
  if (currentLock) {
    // Check to see if the lock is still valid.
    let lockInDB = new Date(currentLock)
    lockInDB = lockInDB.getTime()

    let currentDate = new Date()
    currentDate = currentDate.getTime()
    // The lock valid!
    if (lockInDB > currentDate - releaseTimeout) {
      return false
    } else {
      // The lock expired! delete it!
      await releaseLock(lockName)
    }
  }

  let lock
  // Insert the lock record into the database
  if (process.env.DB_TYPE === 'mongodb') {
    const { db } = mongoose.connection
    lock = await db
      .collection('options')
      .insertOne({ name: lockName + '.lock', value: new Date() })
  } else {
    lock = await aventum
      .knex('options')
      .insert([{ name: lockName + '.lock', value: new Date() }])
  }

  if (lock) {
    return true
  }

  return false
}

const updateDBVersion = async (versionInDB, newVersion) => {
  if (process.env.DB_TYPE === 'mongodb') {
    const { db } = mongoose.connection
    await db
      .collection('options')
      .update(
        { name: 'version' },
        { $set: { name: 'version', value: newVersion } },
        { upsert: true }
      )
  } else {
    if (versionInDB) {
      // Update the version record
      await aventum
        .knex('options')
        .where({ name: 'version' })
        .update({ value: newVersion })
    } else {
      // Insert new record
      await aventum
        .knex('options')
        .insert([{ name: 'version', value: newVersion }])
    }
  }
}

module.exports = async () => {
  /**
   * Check if there is update has to be made.
   */

  // Check if the update folder exists.
  const updateFolderPath = path.join(__dirname, '../updates')

  var updateFolderExist = await fse.pathExists(updateFolderPath)

  if (!updateFolderExist) {
    return
  }

  // Get version number from the database
  // and get coreUpdater.lock to check if there are already update in progress(in case of cluster).
  let data
  if (process.env.DB_TYPE === 'mongodb') {
    const { db } = mongoose.connection
    data = await db
      .collection('options')
      .find({ name: { $in: ['version', 'coreUpdater.lock'] } })
      .toArray()
  } else {
    data = await aventum
      .knex('options')
      .whereIn('name', ['version', 'coreUpdater.lock'])
  }

  const vDB = data.find((i) => i.name === 'version')
  const currentLock = data.find((i) => i.name === 'coreUpdater.lock')

  const versionInDB = vDB ? vDB.value : '1.0.0'

  if (versionInDB !== aventum.version) {
    // We maybe have to update Aventum!

    // Lock the database for 15 minutes, to prevent multiple updates occurring.
    const lock = await createLock({
      lockName: 'coreUpdater',
      releaseTimeout: 900000, // 900000 milliseconds === 15 minutes
      currentLock: currentLock ? currentLock.value : null,
    })

    if (!lock) {
      console.error(`Database locked, probably update in progress!`)
      process.exit(1)
    }

    // Prepare the log
    const logFormat = winston.format.printf(
      ({ level, message, label, timestamp }) => {
        return `${timestamp} [${label}] ${level}: ${message}`
      }
    )

    const logger = winston.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.splat(),
            winston.format.label({ label: 'Update Process' }),
            winston.format.timestamp(),
            logFormat
          ),
        }),
        new winston.transports.File({
          filename: path.join(__dirname, '../contents/logs/update.log'),
          options: { flags: 'w' },
          level: 'error',
          format: winston.format.combine(
            winston.format.splat(),
            winston.format.label({ label: 'Update Process' }),
            winston.format.timestamp(),
            logFormat
          ),
        }),
      ],
    })

    /**
         * Update folder/file structure
          📦updates
          ┣ 📂v1
          ┃ ┣ 📂1.0.1
          ┃ ┃ ┗ 📜index.js
          ┃ ┣ 📂1.0.3
          ┃ ┃ ┗ 📜index.js
          ┃ ┣ 📂1.0.5
          ┃ ┃ ┗ 📜index.js
          ┃ ┗ 📂1.1.0
          ┃ ┃ ┗ 📜index.js
          ┗ 📂v2
          ┃ ┣ 📂2.0.0
          ┃ ┃ ┗ 📜index.js
          ┃ ┣ 📂2.0.1
          ┃ ┃ ┗ 📜index.js
          ┃ ┗ 📂2.0.5
          ┃ ┃ ┗ 📜index.js
  
         * The index file will export default async function.
         */
    const versionList = updateFolderExist ? await readDir(updateFolderPath) : []
    let allFiles = []
    for (const folder of versionList) {
      const fileList = await readDir(
        path.join(__dirname, `../updates/${folder}`)
      )
      allFiles = [...allFiles, ...fileList]
    }

    // Get only the versions that are greater than versionInDB and less than or equal to aventum.version
    const onlyThese = allFiles.filter((f) =>
      semver.satisfies(f, `>${versionInDB} <=${aventum.version}`)
    )

    if (onlyThese.length) {
      logger.info(`Database update process started...`)
    }

    for (const file of onlyThese) {
      const v = file.charAt(0)
      var updateFn = require(path.join(__dirname, `../updates/v${v}/${file}`))

      logger.info(`Start updating to version ${file}`)
      await updateFn({ logger })
      // Update completed new update the version number in the database.
      await updateDBVersion(vDB, file)
      logger.info(`Updating to v${file} completed!`)
    }

    if (onlyThese.length) {
      logger.info(`Database update completed successfully!`)
    }
  }
}

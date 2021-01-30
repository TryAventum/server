const semver = require('semver')
var fs = require('fs')
const winston = require('winston')
var fse = require('fs-extra')
const util = require('util')
const path = require('path')
var mongoose = require('mongoose')
const readDir = util.promisify(fs.readdir)

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

  const vDB = data.find((i) => i.name === 'version')
  const isUpdating = data.find((i) => i.name === 'updating')

  const versionInDB = vDB ? vDB.value : '1.0.0'

  if (!isUpdating && versionInDB !== aventum.version) {
    // Update Aventum
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

    // Insert "updating" record into the database
    if (process.env.DB_TYPE === 'mongodb') {
      const { db } = mongoose.connection
      data = await db
        .collection('options')
        .insertOne({ name: 'updating', value: 'true' })
    } else {
      await aventum
        .knex('options')
        .insert([{ name: 'updating', value: 'true' }])
    }
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
      logger.info(
        `Database updated successfully completed, now doing some clean...`
      )
    }

    // Remove "updating" record.
    logger.info(`Remove "updating" record...`)
    if (process.env.DB_TYPE === 'mongodb') {
      const { db } = mongoose.connection
      data = await db.collection('options').deleteOne({ name: 'updating' })
    } else {
      await aventum.knex('options').where('updating', 'true').del()
    }
    logger.info(`"updating" record removed successfully...`)
    logger.info(`Database update finished!`)
  } else if (isUpdating) {
    console.error('Update in progress!')
    process.exit(1)
  }
}

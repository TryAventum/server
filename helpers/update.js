const semver = require('semver')
var fs = require('fs')
var fse = require('fs-extra')
const util = require('util')
const path = require('path')
var mongoose = require('mongoose')
const readDir = util.promisify(fs.readdir)

module.exports = async () => {
  /**
   * Check if there is update has to be made.
   */

  // Check if the upgrade folder exists.
  const upgradeFolderPath = path.join(__dirname, '../updates')

  var upgradeFolderExist = await fse.pathExists(upgradeFolderPath)

  if (!upgradeFolderExist) {
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
         * Upgrade folder/file structure
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
    const versionList = await readDir(upgradeFolderPath)
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

    for (const file of onlyThese) {
      var upgradeFn = require(path.join(
        __dirname,
        `../updates/v${file.charAt(0)}/${file}`
      ))

      await upgradeFn()
    }
    // Update the version number in the database.
    if (process.env.DB_TYPE === 'mongodb') {
      const { db } = mongoose.connection
      data = await db
        .collection('options')
        .update(
          { name: 'version' },
          { $set: { name: 'version', value: aventum.version } },
          { upsert: true }
        )
    } else {
      if (vDB) {
        // Update the version record
        await aventum
          .knex('options')
          .where({ name: 'version' })
          .update({ value: aventum.version })
      } else {
        // Insert new record
        await aventum
          .knex('options')
          .insert([{ name: 'version', value: aventum.version }])
      }
    }
    // Remove "updating" record.
    if (process.env.DB_TYPE === 'mongodb') {
      const { db } = mongoose.connection
      data = await db.collection('options').deleteOne({ name: 'updating' })
    } else {
      await aventum.knex('options').where('updating', 'true').del()
    }
  } else if (isUpdating) {
    console.error('Update in progress!')
    process.exit(1)
  }
}

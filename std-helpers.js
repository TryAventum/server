/**
 * This file contains the helper functions that don't have any dependency.
 * We shouldn't import any of the project files here, use helpers.js for this
 * purpose.
 */

var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn
var mongoose = require('mongoose')

function getStringID(id) {
  if (id && typeof id === 'object') {
    return id.toString()
  } else {
    return id
  }
}

function isIqZip(value) {
  return /(^\d{5}$)|(^\d{5}-\d{4}$)/.test(value)
}

// https://stackoverflow.com/a/39893636/3263601
function hasIntersection(arr1, arr2) {
  return arr1.some((r) => arr2.includes(r))
}

// https://stackoverflow.com/a/784547/3263601
function lineBreakToBr(str) {
  str = str.replace(/(?:\r\n|\r|\n)/g, '<br />')
  return str
}

function deleteFiles(files) {
  return new Promise((resolve, reject) => {
    var i = files.length
    if (i === 0) {
      resolve()
      return
    }
    files.forEach(function (filepath) {
      fs.unlink(filepath, function (err) {
        i--
        if (err) {
          reject(err)
        } else if (i <= 0) {
          resolve()
        }
      })
    })
  })
}

function arrayUnique(arr) {
  return arr.filter((v, i, a) => a.indexOf(v) === i)
}

/**
 * Make array of objects that contains _id property unique
 */
function arrayUniqueByID(arr) {
  return arr.reduce((a, c) => {
    var f = a.find((e) => e._id.toString() === c._id.toString())
    if (f) {
      return a
    }
    return [...a, c]
  }, [])
}

/**
 * Make array of objects that contains a specific property unique
 */
function arrayUniqueByProperty(arr, property) {
  return arr.reduce((a, c) => {
    var f = a.find((e) => e[property] === c[property])
    if (f) {
      return a
    }
    return [...a, c]
  }, [])
}

function setRealTypes(schema) {
  const newSchema = {}

  for (const s in schema) {
    let isMainArray = false
    let ggg
    if (Array.isArray(schema[s])) {
      isMainArray = true
      ggg = schema[s][0]
    } else {
      ggg = schema[s]
    }
    // There is no type so it has a sub-document(custom field)
    if (!ggg.type) {
      const newSubDocument = {}
      for (const o in ggg) {
        let isItArray = false
        var vvv
        if (Array.isArray(ggg[o])) {
          isItArray = true
          vvv = ggg[o][0]
        } else {
          vvv = ggg[o]
        }
        if (vvv.type === 'relation') {
          vvv.type = mongoose.Schema.Types.ObjectId
        } else if (vvv.type === 'string') {
          vvv.type = String
        } else if (vvv.type === 'decimal') {
          vvv.type = Number
        } else if (vvv.type === 'date') {
          vvv.type = Date
        } else if (vvv.type === 'time') {
          vvv.type = Date
        } else if (vvv.type === 'dateTime') {
          vvv.type = Date
        } else if (vvv.type === 'bigInteger') {
          vvv.type = Number
        }

        newSubDocument[o] = isItArray ? [vvv] : vvv
      }
      newSchema[s] = newSubDocument
    } else {
      if (ggg.type === 'relation') {
        ggg.type = mongoose.Schema.Types.ObjectId
      } else if (ggg.type === 'string') {
        ggg.type = String
      } else if (ggg.type === 'decimal') {
        ggg.type = Number
      } else if (ggg.type === 'date') {
        ggg.type = Date
      } else if (ggg.type === 'time') {
        ggg.type = Date
      } else if (ggg.type === 'dateTime') {
        ggg.type = Date
      } else if (ggg.type === 'bigInteger') {
        ggg.type = Number
      }
    }

    newSchema[s] = isMainArray ? [ggg] : ggg
  }

  return newSchema
}

function requireUncached(module) {
  delete require.cache[require.resolve(module)]
  return require(module)
}

function clearAppRequireCache() {
  Object.keys(require.cache).forEach(function (key) {
    if (!key.includes('node_modules')) {
      delete require.cache[key]
    }
  })
}

function runNpmInstall(cwd) {
  return new Promise((resolve, reject) => {
    var cproc = spawn('npm', ['install'], { cwd, shell: true })

    cproc
      .on('exit', function () {
        resolve(true)
      })
      .on('error', function (err) {
        reject(err)
      })
  })
}

function runNpmPack(options) {
  return new Promise((resolve, reject) => {
    var cproc = spawn('npm', ['pack', options.package], {
      cwd: options.cwd,
      shell: true,
    })

    var allData = ''
    cproc.stdout.on('data', (data) => {
      allData += data
    })

    cproc.stderr.on('data', (data) => {
      // console.log(`stderr: ${data}`)
    })

    cproc.on('close', (code) => {
      resolve(allData)
      //   console.log(`child process exited with code ${code}`);
    })
  })
}

function gitClone(options) {
  return new Promise((resolve, reject) => {
    var gitC = spawn('git', ['clone', options.url], { cwd: options.path })

    gitC
      .on('exit', function () {
        resolve(true)
      })
      .on('error', function (err) {
        reject(err)
      })
  })
}

/**
 * find files in startPath that matches the filter
 * @param {string} startPath the directory to search in
 * @param {RegExp} filter the files must match this filter
 */
function listExtensions(startPath, filter = /package.json/) {
  var foundedFiles = []

  var completedPaths = []

  function finder(startPath, filter) {
    if (!fs.existsSync(startPath)) {
      console.log('no dir ', startPath)
      return
    }

    var files = fs.readdirSync(startPath)
    for (var i = 0; i < files.length; i++) {
      var filename = path.join(startPath, files[i])

      // Ignore node_modules dir
      if (/node_modules/.test(filename)) {
        continue
      }

      /**
       * The completedPaths is the paths that we found package.json file with them,
       * so there is no need to look into the folders within these paths,
       * i.e. stop looking into directory tree after find the first package.json file
       */
      if (completedPaths.some((p) => filename.startsWith(p))) {
        continue
      }

      /**
       * Don't look that much deeper, this will find extensions\@aventum\sample-server-extension\package.json
       * and extensions\sample-server-extension\package.json but not
       * extensions\@aventum\@aventum\sample-server-extension\package.json
       */
      // if((filename.match(/\\|\//g) || []).length > 3){
      //   continue
      // }

      var stat = fs.lstatSync(filename)

      if (stat.isDirectory()) {
        finder(filename, filter) // recurse
      } else if (filter.test(filename)) {
        foundedFiles.push(filename)
        completedPaths.push(filename.replace('package.json', ''))
      }
    }
  }
  finder(startPath, filter)

  return foundedFiles
}

/**
 * @param {Array} objs The objects that we want to remove the properties from them.
 * @param {Array} cleanFrom The properties that we want to remove from the objects.
 */
function deletePropertiesFromObjects(objs, cleanFrom = []) {
  objs = objs.map((obj) => {
    Object.keys(obj).forEach(
      (key) => cleanFrom.includes(key) && delete obj[key]
    )

    return obj
  })

  return objs
}

/**
 * @param {Array} promises
 */
async function sequentiallyResolvePromises(promises) {
  for (const fun of promises) {
    await fun
  }
}

module.exports = {
  lineBreakToBr,
  getStringID,
  isIqZip,
  hasIntersection,
  deleteFiles,
  arrayUnique,
  arrayUniqueByID,
  arrayUniqueByProperty,
  setRealTypes,
  requireUncached,
  clearAppRequireCache,
  gitClone,
  runNpmInstall,
  runNpmPack,
  listExtensions,
  deletePropertiesFromObjects,
  sequentiallyResolvePromises,
}

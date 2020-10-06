const Model = require('./lib/Model')
const { Paginator } = require('../../packages/paginator/index')
const { UploadsHelper } = require('../../packages/uploads-helper/index')

class Upload extends Model {
  constructor (values = null) {
    super('uploads')
    this.modelConfig.values = values
  }

  static async createUpload (values) {
    const Upload = this
    try {
      const upload = await Upload.create(values)

      aventum.cache.batchDeletionKeysByPattern('uploads:p:*')

      return upload
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async getUpload (id, setURL = true) {
    var Upload = this

    var cacheKey = `uploads:g:${id}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (e) {
      // No cache found
      try {
        var upload = await Upload.findRow({ id })

        if (!upload) {
          return null
        }

        if (setURL) {
          upload = await UploadsHelper.setPublicURL(upload)
        }

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, upload)

        return upload
      } catch (e) {
        console.log(e)
        throw new Error(e)
      }
    }
  }

  static async deleteById (id) {
    if (!id) {
      return null
    }

    var Upload = this

    try {
      const upload = await Upload.del({ id })

      aventum.cache.deleteKey(`uploads:g:${id}`)
      aventum.cache.batchDeletionKeysByPattern('uploads:p:*')

      return upload
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async getAllUploads (req, user = null) {
    var cacheKey = `uploads:p:${req.originalUrl}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (error) {
      // No cache found
      try {
        var Upload = this
        // var access = req.query.access
        var query = req.query.query ? JSON.parse(req.query.query) : {}

        // query.path = { $regex: access }

        if (user) {
          if (query.where) {
            query.where.createdBy = user._id
          } else {
            query.where = { createdBy: user._id }
          }
        }

        var uploads = await Upload.find({ ...query })

        uploads = await UploadsHelper.setUploadsPublicURL(uploads)

        const ress = {
          uploads
        }

        aventum.cache.cacheByKey(cacheKey, ress)

        return ress
      } catch (error) {
        console.log(error)
        throw new Error(error)
      }
    }
  }

  static async getUploads (req, user = null) {
    var cacheKey = `uploads:p:${req.originalUrl}`

    try {
      // Check do we have a cache
      var result = await aventum.cache.getByKey(cacheKey)
      // We found the cache
      return result
    } catch (error) {
      try {
        // No cache found

        var Upload = this

        const page = +req.query.page
        var query = req.query.query ? JSON.parse(req.query.query) : {}

        if (user) {
          if (query.where) {
            query.where.createdBy = user._id
          } else {
            query.where = { createdBy: user._id }
          }
        }

        var count = await Upload.count(query)
        const paginatorInstance = new Paginator(page, 20, count)

        // if (!paginatorInstance.hasNextPage() && page !== 1) {
        //     return ({ uploads: [] });
        // }

        var uploads = await Upload.find({
          ...query,
          offset: paginatorInstance.offset(),
          limit: paginatorInstance.perPage
        })

        uploads = await UploadsHelper.setUploadsPublicURL(uploads)

        const ress = {
          uploads,
          pagination: {
            totalPages: paginatorInstance.totalPages(),
            perPage: paginatorInstance.perPage,
            totalCount: paginatorInstance.totalCount
          }
        }

        // Cache this value
        aventum.cache.cacheByKey(cacheKey, ress)

        return ress
      } catch (error) {
        console.log(error)
        throw new Error(error)
      }
    }
  }
}

module.exports = Upload

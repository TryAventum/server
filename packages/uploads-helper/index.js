class UH {
  constructor () {
    this.type = 'image'
    this.images = ['png', 'jpg', 'tif', 'gif', 'jpeg', 'bmp']
    this.videos = ['avi', 'asf', 'mov', 'mpg', 'mp4', 'wmv', 'flv']
  }

  async setUploadURL (upload, req = null) {
    return await this.setPublicURL(upload)
  }

  async setUploadsPublicURL (uploads) {
    var newUploadsWithURL = uploads.map(async upload => await this.setPublicURL(upload))

    newUploadsWithURL = await Promise.all(newUploadsWithURL)
    return newUploadsWithURL
  }

  async setPostsUploadsPublicURL (posts) {
    var newPosts = posts.map(async post => await this.publicPostHelper(post))
    newPosts = await Promise.all(newPosts)
    return newPosts
  }

  async publicPostHelper (post) {
    var newUploadsWithURL = post.uploads.map(async upload => await this.setPublicURL(upload))

    newUploadsWithURL = await Promise.all(newUploadsWithURL)

    post.featured = post.featured ? await this.setPublicURL(post.featured) : {}
    post.uploads = newUploadsWithURL
    return post
  }

  async setPublicURL (upload) {
    if (!upload || !upload.path || upload.path.startsWith('http')) {
      return upload
    }

    const path = '/uploads/' + upload.path

    var {
      getOptionValue
    } = require('../../helpers')

    var UPLOADS_PUBLIC_URL = await getOptionValue('UPLOADS_PUBLIC_URL')
    const URL = `${UPLOADS_PUBLIC_URL}${path}`
    upload.path = URL
    upload.type = this.getFileType(path)
    return upload
  }

  getFileType (path) {
    const fileExtension = path.split('.').pop().toLowerCase()
    if (this.images.indexOf(fileExtension) !== -1) {
      this.type = 'image'
    } else if (this.videos.indexOf(fileExtension) !== -1) {
      this.type = 'video'
    } else {
      this.type = 'other'
    }

    return this.type
  }
}

var UploadsHelper = new UH()

module.exports = { UploadsHelper }

const productsPopulateQuery = [{ path: 'uploads' }, { path: 'featured' }, { path: 'color' }, { path: 'brand' }, {
  path: 'siblings',
  populate: [{ path: 'featured' }]
}, { path: 'sizes.size' }, { path: 'categories' }]

const productsPopulateQueryWithoutSiblings = [{ path: 'uploads' }, { path: 'featured' }, { path: 'color' }, { path: 'brand' }, { path: 'sizes.size' }, { path: 'categories' }]

const gender = ['male', 'female', 'other']
const notificationType = ['success', 'warning', 'error', 'info']
const notificationsStatuses = ['read', 'unread']
const extensionTargets = ['dashboard', 'server']
const providers = ['google', 'facebook']
const productsStatus = ['available', 'notAvailable', 'quantityCarriedOut', 'idle']
const enableDisable = ['enable', 'disable']
const postsStatus = ['publish', 'draft']
const pagesStatus = ['publish', 'draft']
const bannersStatus = ['publish', 'draft']
const bannerLocation = ['home', 'search']
const bannerType = ['products', 'categories', 'brands', 'search']
const commentsStatus = ['publish', 'pendingReview']
const postCommentsStatus = ['open', 'close']

module.exports = {
  productsPopulateQuery,
  productsStatus,
  enableDisable,
  postsStatus,
  postCommentsStatus,
  commentsStatus,
  pagesStatus,
  bannersStatus,
  bannerLocation,
  bannerType,
  gender,
  providers,
  productsPopulateQueryWithoutSiblings,
  notificationsStatuses,
  extensionTargets,
  notificationType
}

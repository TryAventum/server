const { RateLimiterRedis } = require('rate-limiter-flexible')

const Redis = require('ioredis')

const redisClient = new Redis({
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST,
  family: process.env.REDIS_FAMILY,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB,
  enableOfflineQueue: false
})

const rateLimiter = new RateLimiterRedis({
  redis: redisClient,
  keyPrefix: 'middleware',
  points: 10, // 10 requests
  duration: 5, // per 5 second by IP
  blockDuration: 60 * 60 // Block for 1 hour
})

const rateLimiterMiddleware = (req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => {
      next()
    })
    .catch(() => {
      res.status(429).send(req.t('TooManyBadReqs'))
    })
}

module.exports = rateLimiterMiddleware

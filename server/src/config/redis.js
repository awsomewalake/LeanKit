const Redis = require('ioredis')

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
  db: process.env.REDIS_DB || 0,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'kanban:',
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  maxRetriesPerRequest: 3
}

// Create Redis client
const redis = new Redis(redisConfig)

// Event handlers
redis.on('connect', () => {
  console.log('✅ Redis: Connected successfully')
})

redis.on('ready', () => {
  console.log('✅ Redis: Ready to accept commands')
})

redis.on('error', (err) => {
  console.error('❌ Redis Error:', err.message)
})

redis.on('close', () => {
  console.log('⚠️  Redis: Connection closed')
})

redis.on('reconnecting', () => {
  console.log('🔄 Redis: Reconnecting...')
})

// Graceful shutdown
process.on('SIGINT', async () => {
  await redis.quit()
  console.log('Redis connection closed')
  process.exit(0)
})

module.exports = redis
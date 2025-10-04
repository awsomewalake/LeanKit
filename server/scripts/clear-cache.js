require('dotenv').config()
const redis = require('../src/config/redis')

async function clearCache() {
  try {
    console.log('Clearing Redis cache...')
    
    // Get all keys with kanban prefix
    const keys = await redis.keys('kanban:*')
    
    if (keys.length > 0) {
      await redis.del(...keys)
      console.log(`✅ Cleared ${keys.length} cache keys`)
    } else {
      console.log('ℹ️  No cache keys to clear')
    }
    
    await redis.quit()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error clearing cache:', error.message)
    await redis.quit()
    process.exit(1)
  }
}

clearCache()
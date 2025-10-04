const redis = require('../config/redis')

class CacheService {
  constructor() {
    this.defaultTTL = parseInt(process.env.CACHE_TTL) || 600 // 10 minutes
    this.enabled = process.env.CACHE_ENABLED !== 'false'
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or null
   */
  async get(key) {
    if (!this.enabled) return null
    
    try {
      const value = await redis.get(key)
      if (!value) return null
      
      return JSON.parse(value)
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error.message)
      return null
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.enabled) return
    
    try {
      await redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error.message)
    }
  }

  /**
   * Delete one or more keys from cache
   * @param {string|string[]} keys - Key(s) to delete
   */
  async del(keys) {
    if (!this.enabled) return
    
    try {
      const keysArray = Array.isArray(keys) ? keys : [keys]
      if (keysArray.length > 0) {
        await redis.del(...keysArray)
      }
    } catch (error) {
      console.error(`Cache delete error:`, error.message)
    }
  }

  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Pattern to match (e.g., 'user:123:*')
   */
  async delPattern(pattern) {
    if (!this.enabled) return
    
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error(`Cache delete pattern error:`, error.message)
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    if (!this.enabled) return false
    
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error.message)
      return false
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear() {
    if (!this.enabled) return
    
    try {
      await redis.flushdb()
      console.log('✅ Cache cleared')
    } catch (error) {
      console.error('Cache clear error:', error.message)
    }
  }

  /**
   * Get or set cache with callback
   * @param {string} key - Cache key
   * @param {Function} callback - Function to get data if not cached
   * @param {number} ttl - Time to live
   * @returns {Promise<any>}
   */
  async getOrSet(key, callback, ttl = this.defaultTTL) {
    // Try to get from cache first
    const cached = await this.get(key)
    if (cached !== null) {
      return cached
    }

    // If not cached, get fresh data
    try {
      const data = await callback()
      await this.set(key, data, ttl)
      return data
    } catch (error) {
      console.error(`Cache getOrSet error for key ${key}:`, error.message)
      throw error
    }
  }
}

module.exports = new CacheService()
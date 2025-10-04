const { kafka, TOPICS } = require('../config/kafka')
const cacheService = require('../services/cache.service')

class CacheInvalidationConsumer {
  constructor() {
    this.consumer = kafka.consumer({ 
      groupId: process.env.KAFKA_GROUP_ID || 'kanban-cache-invalidation'
    })
    this.isRunning = false
  }

  async start() {
    if (this.isRunning) return

    try {
      await this.consumer.connect()
      console.log('✅ Cache Invalidation Consumer: Connected')

      // Subscribe to all event topics
      await this.consumer.subscribe({ 
        topics: Object.values(TOPICS),
        fromBeginning: false 
      })

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const event = JSON.parse(message.value.toString())
            await this.handleEvent(event)
          } catch (error) {
            console.error('Cache invalidation error:', error.message)
          }
        }
      })

      this.isRunning = true
      console.log('✅ Cache Invalidation Consumer: Running')
    } catch (error) {
      console.error('❌ Cache Invalidation Consumer error:', error.message)
      throw error
    }
  }

  async handleEvent(event) {
    const { type, data } = event
    const keysToInvalidate = []

    // Board events
    if (type.includes('board')) {
      keysToInvalidate.push(
        `board:${data.boardId}`,
        `user:${data.userId}:boards`
      )
    }

    // Section events
    if (type.includes('section')) {
      keysToInvalidate.push(
        `section:${data.sectionId}`,
        `section:${data.sectionId}:tasks`,
        `board:${data.boardId}:sections`,
        `board:${data.boardId}`
      )
    }

    // Task events
    if (type.includes('task')) {
      keysToInvalidate.push(
        `task:${data.taskId}`,
        `section:${data.sectionId}:tasks`,
        `board:${data.boardId}:sections`,
        `board:${data.boardId}`
      )
    }

    // User events
    if (type.includes('user')) {
      keysToInvalidate.push(
        `user:${data.userId}`,
        `user:${data.userId}:boards`,
        `user:${data.userId}:session`
      )
    }

    // Invalidate cache keys
    if (keysToInvalidate.length > 0) {
      await cacheService.del(keysToInvalidate)
      console.log(`🗑️  Cache invalidated: ${keysToInvalidate.length} keys for ${type}`)
    }
  }

  async stop() {
    if (!this.isRunning) return

    try {
      await this.consumer.disconnect()
      this.isRunning = false
      console.log('Cache Invalidation Consumer: Stopped')
    } catch (error) {
      console.error('Cache Invalidation Consumer stop error:', error.message)
    }
  }
}

module.exports = new CacheInvalidationConsumer()
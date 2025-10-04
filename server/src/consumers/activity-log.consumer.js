const { kafka, TOPICS } = require('../config/kafka')
const ActivityLog = require('../v1/models/activityLog')

class ActivityLogConsumer {
  constructor() {
    this.consumer = kafka.consumer({ 
      groupId: process.env.KAFKA_GROUP_ID_ACTIVITY || 'kanban-activity-log'
    })
    this.isRunning = false
  }

  async start() {
    if (this.isRunning) return

    try {
      await this.consumer.connect()
      console.log('✅ Activity Log Consumer: Connected')

      // Subscribe to all event topics
      await this.consumer.subscribe({ 
        topics: Object.values(TOPICS),
        fromBeginning: false 
      })

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const event = JSON.parse(message.value.toString())
            await this.logActivity(event)
          } catch (error) {
            console.error('Activity log error:', error.message)
          }
        }
      })

      this.isRunning = true
      console.log('✅ Activity Log Consumer: Running')
    } catch (error) {
      console.error('❌ Activity Log Consumer error:', error.message)
      throw error
    }
  }

  async logActivity(event) {
    try {
      const { type, data, time } = event

      // Determine entity type
      let entityType = 'unknown'
      let entityId = null
      
      if (type.includes('board')) {
        entityType = 'board'
        entityId = data.boardId
      } else if (type.includes('section')) {
        entityType = 'section'
        entityId = data.sectionId
      } else if (type.includes('task')) {
        entityType = 'task'
        entityId = data.taskId
      } else if (type.includes('user')) {
        entityType = 'user'
        entityId = data.userId
      }

      // Extract event type (e.g., 'created', 'updated', 'deleted')
      const eventType = type.split('.').pop().toUpperCase()

      // Create activity log entry
      await ActivityLog.create({
        eventType: `${entityType.toUpperCase()}_${eventType}`,
        entityType,
        entityId,
        boardId: data.boardId || null,
        userId: data.userId,
        metadata: {
          ...data,
          originalEventType: type,
          timestamp: time
        }
      })

      console.log(`📝 Activity logged: ${entityType.toUpperCase()}_${eventType}`)
    } catch (error) {
      console.error('Failed to log activity:', error.message)
    }
  }

  async stop() {
    if (!this.isRunning) return

    try {
      await this.consumer.disconnect()
      this.isRunning = false
      console.log('Activity Log Consumer: Stopped')
    } catch (error) {
      console.error('Activity Log Consumer stop error:', error.message)
    }
  }
}

module.exports = new ActivityLogConsumer()
const { kafka, TOPICS } = require('../config/kafka')

class KafkaProducer {
  constructor() {
    this.producer = kafka.producer()
    this.isConnected = false
  }

  async connect() {
    if (this.isConnected) return

    try {
      await this.producer.connect()
      this.isConnected = true
      console.log('✅ Kafka Producer: Connected')
    } catch (error) {
      console.error('❌ Kafka Producer connection error:', error.message)
      throw error
    }
  }

  async disconnect() {
    if (!this.isConnected) return

    try {
      await this.producer.disconnect()
      this.isConnected = false
      console.log('Kafka Producer: Disconnected')
    } catch (error) {
      console.error('Kafka Producer disconnect error:', error.message)
    }
  }

  /**
   * Send event to Kafka topic
   * @param {string} topic - Topic name
   * @param {object} event - Event data
   */
  async sendEvent(topic, event) {
    if (!this.isConnected) {
      await this.connect()
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: event.data.boardId || event.data.userId || null,
            value: JSON.stringify(event),
            timestamp: Date.now().toString()
          }
        ]
      })
    } catch (error) {
      console.error(`Kafka send error to topic ${topic}:`, error.message)
    }
  }

  /**
   * Send board event
   */
  async sendBoardEvent(eventType, boardData, metadata = {}) {
    const event = {
      specversion: '1.0',
      type: `com.kanban.board.${eventType}`,
      source: '/api/boards',
      id: `${boardData._id}-${Date.now()}`,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: {
        boardId: boardData._id.toString(),
        userId: boardData.user.toString(),
        title: boardData.title,
        version: boardData.version,
        ...metadata
      }
    }

    await this.sendEvent(TOPICS.BOARD_EVENTS, event)
  }

  /**
   * Send section event
   */
  async sendSectionEvent(eventType, sectionData, metadata = {}) {
    const event = {
      specversion: '1.0',
      type: `com.kanban.section.${eventType}`,
      source: '/api/sections',
      id: `${sectionData._id}-${Date.now()}`,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: {
        sectionId: sectionData._id.toString(),
        boardId: sectionData.board.toString(),
        title: sectionData.title,
        version: sectionData.version,
        ...metadata
      }
    }

    await this.sendEvent(TOPICS.SECTION_EVENTS, event)
  }

  /**
   * Send task event
   */
  async sendTaskEvent(eventType, taskData, metadata = {}) {
    const event = {
      specversion: '1.0',
      type: `com.kanban.task.${eventType}`,
      source: '/api/tasks',
      id: `${taskData._id}-${Date.now()}`,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: {
        taskId: taskData._id.toString(),
        sectionId: taskData.section.toString(),
        boardId: taskData.board.toString(),
        title: taskData.title,
        version: taskData.version,
        ...metadata
      }
    }

    await this.sendEvent(TOPICS.TASK_EVENTS, event)
  }

  /**
   * Send user event
   */
  async sendUserEvent(eventType, userData, metadata = {}) {
    const event = {
      specversion: '1.0',
      type: `com.kanban.user.${eventType}`,
      source: '/api/users',
      id: `${userData._id}-${Date.now()}`,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: {
        userId: userData._id.toString(),
        username: userData.username,
        version: userData.version,
        ...metadata
      }
    }

    await this.sendEvent(TOPICS.USER_EVENTS, event)
  }
}

// Export singleton instance
module.exports = new KafkaProducer()
const { Kafka, logLevel } = require('kafkajs')

// Kafka configuration
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'kanban-app',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  logLevel: logLevel.INFO,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
})

// Topic names
const TOPICS = {
  BOARD_EVENTS: 'board-events',
  SECTION_EVENTS: 'section-events',
  TASK_EVENTS: 'task-events',
  USER_EVENTS: 'user-events'
}

// Create topics if they don't exist
const createTopics = async () => {
  const admin = kafka.admin()
  
  try {
    await admin.connect()
    console.log('✅ Kafka Admin: Connected')
    
    const existingTopics = await admin.listTopics()
    const topicsToCreate = Object.values(TOPICS).filter(
      topic => !existingTopics.includes(topic)
    )
    
    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        topics: topicsToCreate.map(topic => ({
          topic,
          numPartitions: 3,
          replicationFactor: 1
        }))
      })
      console.log(`✅ Kafka: Created topics: ${topicsToCreate.join(', ')}`)
    } else {
      console.log('✅ Kafka: All topics already exist')
    }
    
    await admin.disconnect()
  } catch (error) {
    console.error('❌ Kafka: Error creating topics:', error.message)
    await admin.disconnect()
  }
}

module.exports = {
  kafka,
  TOPICS,
  createTopics
}
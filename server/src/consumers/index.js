require('dotenv').config()
const mongoose = require('mongoose')
const { createTopics } = require('../config/kafka')
const cacheInvalidationConsumer = require('./cache-invalidation.consumer')
const activityLogConsumer = require('./activity-log.consumer')

async function startConsumers() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URL)
    console.log('✅ MongoDB: Connected')

    // Create Kafka topics if they don't exist
    await createTopics()

    // Start consumers
    console.log('\nStarting Kafka consumers...')
    await cacheInvalidationConsumer.start()
    await activityLogConsumer.start()

    console.log('\n🚀 All consumers are running!')
    console.log('Press Ctrl+C to stop\n')
  } catch (error) {
    console.error('❌ Failed to start consumers:', error.message)
    process.exit(1)
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down consumers...')
  
  await cacheInvalidationConsumer.stop()
  await activityLogConsumer.stop()
  await mongoose.connection.close()
  
  console.log('✅ Shutdown complete')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// Start consumers
startConsumers()
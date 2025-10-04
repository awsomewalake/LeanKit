const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors')

const app = express();

app.use(cors())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Kafka and Redis
const { createTopics } = require('./src/config/kafka')
const kafkaProducer = require('./src/services/kafka.producer')
const redis = require('./src/config/redis')

// Initialize services function
async function initializeServices() {
  try {
    console.log('🔄 Initializing services...')
    
    // Test Redis connection
    await redis.ping()
    console.log('✅ Redis: Connection verified')

    // Create Kafka topics
    await createTopics()

    // Connect Kafka producer
    await kafkaProducer.connect()
    
    console.log('✅ All services initialized successfully\n')
  } catch (error) {
    console.error('⚠️  Service initialization warning:', error.message)
    console.log('⚠️  Application will continue without Kafka/Redis features\n')
  }
}

// Call initialization (non-blocking)
initializeServices().catch(err => {
  console.error('Service initialization failed:', err.message)
})

// Routes
app.use('/api/v1', require('./src/v1/routes'));

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Gracefully shutting down...')
  try {
    await kafkaProducer.disconnect()
    await redis.quit()
    console.log('✅ Services closed')
  } catch (error) {
    console.error('Error during shutdown:', error.message)
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Gracefully shutting down...')
  try {
    await kafkaProducer.disconnect()
    await redis.quit()
    console.log('✅ Services closed')
  } catch (error) {
    console.error('Error during shutdown:', error.message)
  }
  process.exit(0)
})

module.exports = app;
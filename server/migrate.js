require('dotenv').config() // Load environment variables

const mongoose = require('mongoose')
const Board = require('./src/v1/models/board')
const Section = require('./src/v1/models/section')
const Task = require('./src/v1/models/task')
const User = require('./src/v1/models/user')

// Set strictQuery to suppress warning
mongoose.set('strictQuery', false)

async function migrate() {
  try {
    // Check if MONGODB_URL exists
    const mongoUrl = process.env.MONGODB_URL || process.env.MONGO_URI || process.env.DATABASE_URL
    
    if (!mongoUrl) {
      console.error('❌ Error: MongoDB connection string not found in environment variables')
      console.log('Please check your .env file for one of these:')
      console.log('  - MONGODB_URL')
      console.log('  - MONGO_URI')
      console.log('  - DATABASE_URL')
      process.exit(1)
    }

    console.log('Connecting to MongoDB...')
    await mongoose.connect(mongoUrl)
    console.log('✅ Connected to MongoDB\n')

    // Count documents before migration
    const boardCount = await Board.countDocuments()
    const sectionCount = await Section.countDocuments()
    const taskCount = await Task.countDocuments()
    const userCount = await User.countDocuments()

    console.log(`Found:`)
    console.log(`  - ${boardCount} boards`)
    console.log(`  - ${sectionCount} sections`)
    console.log(`  - ${taskCount} tasks`)
    console.log(`  - ${userCount} users\n`)

    // Migrate Boards
    console.log('📋 Migrating boards...')
    const boardResult = await Board.updateMany(
      { version: { $exists: false } },
      { $set: { version: 1, lastAccessedAt: new Date() } }
    )
    console.log(`  ✅ Updated ${boardResult.modifiedCount} boards`)

    // Migrate Sections
    console.log('📂 Migrating sections...')
    const sectionResult = await Section.updateMany(
      { version: { $exists: false } },
      { $set: { version: 1, position: 0 } }
    )
    console.log(`  ✅ Updated ${sectionResult.modifiedCount} sections`)

    // Migrate Users
    console.log('👤 Migrating users...')
    const userResult = await User.updateMany(
      { version: { $exists: false } },
      { $set: { version: 1, lastActiveAt: new Date() } }
    )
    console.log(`  ✅ Updated ${userResult.modifiedCount} users`)

    // Migrate Tasks - Add board reference
    console.log('✅ Migrating tasks (adding board reference)...')
    const sections = await Section.find().select('_id board').lean()
    let taskUpdateCount = 0

    for (const section of sections) {
      const result = await Task.updateMany(
        { section: section._id, board: { $exists: false } },
        { $set: { board: section.board, version: 1 } }
      )
      taskUpdateCount += result.modifiedCount
    }
    console.log(`  ✅ Updated ${taskUpdateCount} tasks`)

    console.log('\n🎉 Migration completed successfully!')
    console.log('\nSummary:')
    console.log(`  - ${boardResult.modifiedCount} boards updated`)
    console.log(`  - ${sectionResult.modifiedCount} sections updated`)
    console.log(`  - ${userResult.modifiedCount} users updated`)
    console.log(`  - ${taskUpdateCount} tasks updated`)

    await mongoose.connection.close()
    console.log('\n✅ Database connection closed')
    process.exit(0)

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

// Run migration
migrate()
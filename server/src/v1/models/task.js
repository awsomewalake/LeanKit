const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { schemaOptions } = require('./modelOptions')

const taskSchema = new Schema({
  section: {
    type: Schema.Types.ObjectId,
    ref: 'Section',
    required: true,
    index: true
  },
  title: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  position: {
    type: Number,
    default: 0
  },
  
  // NEW: Essential fields for Kafka & Redis
  board: {
    type: Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
    index: true
  },
  version: {
    type: Number,
    default: 1
  }
}, schemaOptions)

// Indexes
taskSchema.index({ section: 1, position: 1 })
taskSchema.index({ board: 1 })

// Method to increment version
taskSchema.methods.incrementVersion = function() {
  this.version += 1
  return this
}

// Method to get cache key
taskSchema.methods.getCacheKey = function() {
  return `task:${this._id}`
}

// Method to get all related cache keys for invalidation
taskSchema.methods.getInvalidationKeys = function() {
  return [
    `task:${this._id}`,
    `section:${this.section}:tasks`,
    `board:${this.board}:sections`
  ]
}

// Static method to get next position
taskSchema.statics.getNextPosition = async function(sectionId) {
  const lastTask = await this.findOne({ section: sectionId })
    .sort({ position: -1 })
    .select('position')
  return lastTask ? lastTask.position + 1 : 0
}

module.exports = mongoose.model('Task', taskSchema)
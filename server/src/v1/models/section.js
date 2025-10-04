const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { schemaOptions } = require('./modelOptions')

const sectionSchema = new Schema({
  board: {
    type: Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
    index: true
  },
  title: {
    type: String,
    default: ''
  },
  
  // NEW: Essential fields for Kafka & Redis
  position: {
    type: Number,
    default: 0
  },
  version: {
    type: Number,
    default: 1
  }
}, schemaOptions)

// Indexes
sectionSchema.index({ board: 1, position: 1 })

// Method to increment version
sectionSchema.methods.incrementVersion = function() {
  this.version += 1
  return this
}

// Method to get cache key
sectionSchema.methods.getCacheKey = function() {
  return `section:${this._id}`
}

// Method to get all related cache keys for invalidation
sectionSchema.methods.getInvalidationKeys = function() {
  return [
    `section:${this._id}`,
    `section:${this._id}:tasks`,
    `board:${this.board}:sections`
  ]
}

// Static method to get next position
sectionSchema.statics.getNextPosition = async function(boardId) {
  const lastSection = await this.findOne({ board: boardId })
    .sort({ position: -1 })
    .select('position')
  return lastSection ? lastSection.position + 1 : 0
}

module.exports = mongoose.model('Section', sectionSchema)
const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { schemaOptions } = require('./modelOptions')

const boardSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  icon: {
    type: String,
    default: '📃'
  },
  title: {
    type: String,
    default: 'Untitled'
  },
  description: {
    type: String,
    default: `Add description here
    🟢 You can add multiline description
    🟢 Let's start...`
  },
  position: {
    type: Number,
    default: 0
  },
  favourite: {
    type: Boolean,
    default: false
  },
  favouritePosition: {
    type: Number,
    default: 0
  },
  
  // NEW: Essential fields for Kafka & Redis
  version: {
    type: Number,
    default: 1
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
}, schemaOptions)

// Indexes
boardSchema.index({ user: 1, position: 1 })
boardSchema.index({ user: 1, favourite: 1 })

// Method to increment version (for optimistic locking)
boardSchema.methods.incrementVersion = function() {
  this.version += 1
  return this
}

// Method to get cache key
boardSchema.methods.getCacheKey = function() {
  return `board:${this._id}`
}

// Method to get all related cache keys for invalidation
boardSchema.methods.getInvalidationKeys = function() {
  return [
    `board:${this._id}`,
    `user:${this.user}:boards`
  ]
}

module.exports = mongoose.model('Board', boardSchema)
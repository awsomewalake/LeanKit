const mongoose = require('mongoose')
const { schemaOptions } = require('./modelOptions')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  
  // NEW: Essential fields for Kafka & Redis
  version: {
    type: Number,
    default: 1
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, schemaOptions)

// Method to increment version
userSchema.methods.incrementVersion = function() {
  this.version += 1
  return this
}

// Method to get cache key
userSchema.methods.getCacheKey = function() {
  return `user:${this._id}`
}

// Method to get all related cache keys for invalidation
userSchema.methods.getInvalidationKeys = function() {
  return [
    `user:${this._id}`,
    `user:${this._id}:boards`,
    `user:${this._id}:session`
  ]
}

module.exports = mongoose.model('User', userSchema)
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const activityLogSchema = new Schema({
  eventType: {
    type: String,
    required: true,
    index: true
    // Examples: 'BOARD_CREATED', 'TASK_MOVED', 'SECTION_DELETED'
  },
  entityType: {
    type: String,
    required: true,
    enum: ['board', 'section', 'task', 'user']
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  boardId: {
    type: Schema.Types.ObjectId,
    ref: 'Board',
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
})

// Compound indexes for common queries
activityLogSchema.index({ boardId: 1, createdAt: -1 })
activityLogSchema.index({ userId: 1, createdAt: -1 })
activityLogSchema.index({ entityId: 1, createdAt: -1 })

module.exports = mongoose.model('ActivityLog', activityLogSchema)
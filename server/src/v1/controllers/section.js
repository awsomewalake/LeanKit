const Section = require('../models/section')
const Task = require('../models/task')
const kafkaProducer = require('../../services/kafka.producer')
const cacheService = require('../../services/cache.service')

exports.create = async (req, res) => {
  const { boardId } = req.params
  try {
    // Get next position for the new section
    const position = await Section.getNextPosition(boardId)
    
    const section = await Section.create({ 
      board: boardId,
      position: position
    })
    
    section._doc.tasks = []

    // Send Kafka event
    await kafkaProducer.sendSectionEvent('created', section)

    // Invalidate cache
    await cacheService.del([
      `board:${boardId}:sections`,
      `board:${boardId}:full`
    ])

    res.status(201).json(section)
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.update = async (req, res) => {
  const { sectionId } = req.params
  try {
    const section = await Section.findByIdAndUpdate(
      sectionId,
      { $set: req.body },
      { new: true }
    )
    
    if (!section) {
      return res.status(404).json({ message: 'Section not found' })
    }
    
    // Increment version for optimistic locking
    section.incrementVersion()
    await section.save()
    
    section._doc.tasks = []

    // Send Kafka event
    await kafkaProducer.sendSectionEvent('updated', section, {
      updatedFields: Object.keys(req.body)
    })

    // Invalidate cache
    const keys = section.getInvalidationKeys()
    await cacheService.del(keys)

    res.status(200).json(section)
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.delete = async (req, res) => {
  const { sectionId } = req.params
  try {
    const section = await Section.findById(sectionId)
    if (!section) {
      return res.status(404).json({ message: 'Section not found' })
    }
    
    // Delete all tasks in this section
    await Task.deleteMany({ section: sectionId })
    
    // Delete the section
    await Section.deleteOne({ _id: sectionId })
    
    // Re-position remaining sections in the board
    const remainingSections = await Section.find({ board: section.board }).sort('position')
    for (let i = 0; i < remainingSections.length; i++) {
      if (remainingSections[i].position !== i) {
        await Section.findByIdAndUpdate(
          remainingSections[i]._id,
          { $set: { position: i } }
        )
      }
    }

    // Send Kafka event
    await kafkaProducer.sendSectionEvent('deleted', section)

    // Invalidate cache
    const keys = section.getInvalidationKeys()
    await cacheService.del(keys)
    
    res.status(200).json('deleted')
  } catch (err) {
    res.status(500).json(err)
  }
}
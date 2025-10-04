const Task = require('../models/task')
const Section = require('../models/section')
const kafkaProducer = require('../../services/kafka.producer')
const cacheService = require('../../services/cache.service')

exports.create = async (req, res) => {
  const { sectionId } = req.body
  try {
    // Get section to retrieve board ID
    const section = await Section.findById(sectionId)
    if (!section) {
      return res.status(404).json({ message: 'Section not found' })
    }

    const tasksCount = await Task.find({ section: sectionId }).count()
    
    const task = await Task.create({
      section: sectionId,
      board: section.board,
      position: tasksCount > 0 ? tasksCount : 0
    })
    
    task._doc.section = section

    // Send Kafka event
    await kafkaProducer.sendTaskEvent('created', task)

    // Invalidate cache
    await cacheService.del([
      `section:${sectionId}:tasks`,
      `board:${section.board}:full`
    ])

    res.status(201).json(task)
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.update = async (req, res) => {
  const { taskId } = req.params
  try {
    const task = await Task.findByIdAndUpdate(
      taskId,
      { $set: req.body },
      { new: true }
    )
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }
    
    // Increment version for optimistic locking
    task.incrementVersion()
    await task.save()

    // Send Kafka event
    await kafkaProducer.sendTaskEvent('updated', task, {
      updatedFields: Object.keys(req.body)
    })

    // Invalidate cache
    const keys = task.getInvalidationKeys()
    await cacheService.del(keys)
    
    res.status(200).json(task)
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.delete = async (req, res) => {
  const { taskId } = req.params
  try {
    const currentTask = await Task.findById(taskId)
    if (!currentTask) {
      return res.status(404).json({ message: 'Task not found' })
    }
    
    await Task.deleteOne({ _id: taskId })
    
    // Re-position remaining tasks
    const tasks = await Task.find({ section: currentTask.section }).sort('position')
    for (const key in tasks) {
      await Task.findByIdAndUpdate(
        tasks[key].id,
        { $set: { position: key } }
      )
    }

    // Send Kafka event
    await kafkaProducer.sendTaskEvent('deleted', currentTask)

    // Invalidate cache
    const keys = currentTask.getInvalidationKeys()
    await cacheService.del(keys)
    
    res.status(200).json('deleted')
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.updatePosition = async (req, res) => {
  const {
    resourceList,
    destinationList,
    resourceSectionId,
    destinationSectionId
  } = req.body
  
  const resourceListReverse = resourceList.reverse()
  const destinationListReverse = destinationList.reverse()
  
  try {
    // Get destination section to get board ID
    const destinationSection = await Section.findById(destinationSectionId)
    if (!destinationSection) {
      return res.status(404).json({ message: 'Destination section not found' })
    }

    // If moving between different sections
    if (resourceSectionId !== destinationSectionId) {
      for (const key in resourceListReverse) {
        await Task.findByIdAndUpdate(
          resourceListReverse[key].id,
          {
            $set: {
              section: resourceSectionId,
              position: key
            }
          }
        )
      }
    }
    
    // Update destination list positions
    for (const key in destinationListReverse) {
      const task = await Task.findByIdAndUpdate(
        destinationListReverse[key].id,
        {
          $set: {
            section: destinationSectionId,
            board: destinationSection.board,
            position: key
          },
          $inc: { version: 1 }
        },
        { new: true }
      )

      // Send Kafka event for task move
      if (resourceSectionId !== destinationSectionId) {
        await kafkaProducer.sendTaskEvent('moved', task, {
          fromSectionId: resourceSectionId,
          toSectionId: destinationSectionId,
          newPosition: key
        })
      } else {
        await kafkaProducer.sendTaskEvent('reordered', task, {
          newPosition: key
        })
      }
    }

    // Invalidate cache for both sections
    await cacheService.del([
      `section:${resourceSectionId}:tasks`,
      `section:${destinationSectionId}:tasks`,
      `board:${destinationSection.board}:full`
    ])
    
    res.status(200).json('updated')
  } catch (err) {
    res.status(500).json(err)
  }
}